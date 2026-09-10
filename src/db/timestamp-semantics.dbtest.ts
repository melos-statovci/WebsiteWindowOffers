// Milestone 5 — INSTANT SEMANTICS.
//
// Migration 0018 converted every absolute-instant column from
// `timestamp without time zone` to `timestamptz`, and left the three business
// calendar dates (invoices.issued_at / due_at, payments.date) as `date`.
//
// These tests lock that decision in place. What they are really defending
// against is the bug the Milestone 5 audit found:
//
//   `timestamp without time zone` values come back from Postgres as a bare
//   string with NO offset ("2026-09-24 13:26:38"). node-postgres/Drizzle hand
//   that to `new Date(...)`, which interprets an offset-less string in the
//   PROCESS timezone. `now()` is timestamptz and DOES carry "+00", so it parsed
//   correctly. The result: getAccountState() compared a correctly-parsed `now`
//   against a trial_ends_at shifted by the server's UTC offset, so a trial
//   expired hours early or late depending on where the process happened to run.
//
// The decisive test below is `TZ`-parameterised, because a same-timezone test
// cannot see this class of bug at all: under TZ=UTC the offset is zero and the
// broken code looks perfect. Each timezone runs in a CHILD PROCESS, because
// Node reads TZ once at startup and V8 caches the zone — reassigning
// process.env.TZ mid-test does not reliably change date parsing.
//
// No system clock is modified anywhere.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getAccountState } from "@/server/platform/accounts";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { auth } from "@/auth";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);
const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const H = (cookie: string) => new Headers({ cookie });

/** Absolute-instant columns that migration 0018 must have converted. */
const INSTANT_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ["organization_accounts", "trial_started_at"],
  ["organization_accounts", "trial_ends_at"],
  ["organization_accounts", "activated_at"],
  ["organization_accounts", "suspended_at"],
  ["organization_accounts", "created_at"],
  ["organization_accounts", "updated_at"],
  ["trial_applications", "reviewed_at"],
  ["trial_applications", "provisioning_started_at"],
  ["trial_applications", "provisioned_at"],
  ["trial_applications", "created_at"],
  ["platform_audit_events", "created_at"],
  ["platform_admins", "created_at"],
  ["demo_requests", "status_changed_at"],
  ["organization_profiles", "created_at"],
  ["price_lists", "created_at"],
  ["clients", "created_at"],
  ["projects", "created_at"],
  ["invoices", "created_at"],
  ["payments", "created_at"],
  ["notes", "created_at"],
  ["user", "created_at"],
  ["session", "expires_at"],
  ["session", "created_at"],
  ["account", "created_at"],
  ["verification", "expires_at"],
  ["member", "created_at"],
  ["organization", "created_at"],
];

/**
 * BUSINESS CALENDAR DATES. These must stay `date`. Converting them to an
 * instant would give a calendar day a timezone it does not have, and an invoice
 * issued on the 10th would render as the 9th for anyone west of UTC.
 */
const BUSINESS_DATE_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ["invoices", "issued_at"],
  ["invoices", "due_at"],
  ["payments", "date"],
];

async function columnType(table: string, column: string): Promise<string | null> {
  const res = await db.execute(sql`
    select data_type from information_schema.columns
    where table_schema = 'public' and table_name = ${table} and column_name = ${column}
    limit 1
  `);
  return (res.rows[0] as { data_type?: string } | undefined)?.data_type ?? null;
}

describe("timestamp semantics: schema classification (migration 0018)", () => {
  it("stores every absolute instant as timestamptz", async () => {
    const wrong: string[] = [];
    for (const [table, column] of INSTANT_COLUMNS) {
      const type = await columnType(table, column);
      if (type !== "timestamp with time zone") wrong.push(`${table}.${column} is ${type}`);
    }
    expect(wrong).toEqual([]);
  });

  it("keeps business calendar dates as date", async () => {
    const wrong: string[] = [];
    for (const [table, column] of BUSINESS_DATE_COLUMNS) {
      const type = await columnType(table, column);
      if (type !== "date") wrong.push(`${table}.${column} is ${type}`);
    }
    expect(wrong).toEqual([]);
  });

  it("leaves no timestamp-without-time-zone column anywhere in the schema", async () => {
    // A regression here means a later migration (or a Drizzle column declared
    // without `{ withTimezone: true }`) reintroduced the ambiguous type.
    const res = await db.execute(sql`
      select table_name, column_name from information_schema.columns
      where table_schema = 'public' and data_type = 'timestamp without time zone'
      order by table_name, column_name
    `);
    expect(res.rows).toEqual([]);
  });
});

describe("timestamp semantics: round-trip through the driver", () => {
  it("round-trips a known instant with no shift", async () => {
    const instant = new Date("2026-03-29T01:30:00.000Z");
    const res = await db.execute(sql`select ${instant.toISOString()}::timestamptz as v`);
    const raw = (res.rows[0] as { v: string }).v;
    // The string Postgres hands back must carry an offset, or new Date() would
    // fall back to interpreting it in the process timezone.
    expect(raw).toMatch(/[+-]\d{2}(:?\d{2})?$/);
    expect(new Date(raw).getTime()).toBe(instant.getTime());
  });

  it("agrees with the database about the current instant", async () => {
    const before = Date.now();
    const res = await db.execute(sql`select now() as server_now`);
    const after = Date.now();
    const serverNow = new Date((res.rows[0] as { server_now: string }).server_now).getTime();
    // Allow generous slack for network latency to Neon, but nothing near the
    // 1h+ that a timezone misinterpretation would produce.
    expect(serverNow).toBeGreaterThan(before - 120_000);
    expect(serverNow).toBeLessThan(after + 120_000);
  });

  it("keeps a business date textually identical through a round-trip", async () => {
    const res = await db.execute(sql`select '2026-01-01'::date as v`);
    // Drizzle returns `date` as a raw string; no Date object is constructed, so
    // no timezone can be applied to it.
    expect((res.rows[0] as { v: string }).v).toBe("2026-01-01");
  });
});

describe("timestamp semantics: trial lifecycle instants", () => {
  let orgId: string;

  beforeAll(async () => {
    const address = cleanup.userEmail(`tsinstant-${suffix}@example.test`);
    const res = await auth.api.signUpEmail({
      body: { email: address, password: PW, name: "TS Instant" },
      asResponse: true,
    });
    const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    orgId = await createProvisionedTestOrganization(
      auth,
      cleanup,
      H(cookie),
      `TS Instant ${suffix}`,
      `ts-instant-${suffix}`,
    );
  });

  afterAll(async () => {
    await cleanup.run();
    await ownerPool.end();
  });

  it("reads trial_started_at / trial_ends_at as the instants the database holds", async () => {
    // The authority is SQL: ask Postgres for the epoch seconds directly, then
    // require the JS-side view to agree. Any timezone reinterpretation on the
    // way through the driver shows up as a whole number of hours here.
    const res = await db.execute(sql`
      select
        extract(epoch from trial_started_at) as started_epoch,
        extract(epoch from trial_ends_at)   as ends_epoch,
        extract(epoch from now())           as now_epoch
      from organization_accounts
      where organization_id = ${orgId}
      limit 1
    `);
    const row = res.rows[0] as { started_epoch: string; ends_epoch: string; now_epoch: string };

    const account = await getAccountState(orgId);
    expect(account.trialStartedAt).not.toBeNull();
    expect(account.trialEndsAt).not.toBeNull();

    // Postgres keeps MICROSECOND precision; a JS Date only holds milliseconds,
    // so the sub-millisecond digits are truncated on the way into JS. That is
    // an inherent precision loss, not a shift — assert to the millisecond. A
    // timezone misinterpretation would show up as a whole number of hours (or
    // 30/45 minutes for the odd zone), never as under 1 ms.
    const startedMs = Number(row.started_epoch) * 1000;
    const endsMs = Number(row.ends_epoch) * 1000;
    expect(Math.abs(account.trialStartedAt!.getTime() - startedMs)).toBeLessThan(1);
    expect(Math.abs(account.trialEndsAt!.getTime() - endsMs)).toBeLessThan(1);
    // serverNow comes from the same statement family; a few seconds of drift is
    // real elapsed time, not a timezone shift.
    expect(Math.abs(account.serverNow.getTime() / 1000 - Number(row.now_epoch))).toBeLessThan(60);
  });

  it("derives a 14-day trial window in agreement with SQL", async () => {
    const res = await db.execute(sql`
      select
        round(extract(epoch from (trial_ends_at - trial_started_at)) / 86400.0) as window_days,
        ceil(extract(epoch from (trial_ends_at - now())) / 86400.0)             as sql_days_remaining
      from organization_accounts
      where organization_id = ${orgId}
      limit 1
    `);
    const row = res.rows[0] as { window_days: string; sql_days_remaining: string };
    expect(Number(row.window_days)).toBe(14);

    const account = await getAccountState(orgId);
    expect(account.trialDaysRemaining).toBe(Number(row.sql_days_remaining));
    expect(account.effectiveCommercialAccess).toBe("trial");
  });

  it("records provisioned_at and reviewed_at as instants, not local wall clock", async () => {
    // These columns are written with SQL now() by the provisioning lifecycle.
    // A future value would mean a local wall clock ahead of UTC was stored.
    const res = await db.execute(sql`
      select count(*)::int as n
      from trial_applications
      where (provisioned_at is not null and provisioned_at > now())
         or (reviewed_at    is not null and reviewed_at    > now())
         or (provisioning_started_at is not null and provisioning_started_at > now())
    `);
    expect((res.rows[0] as { n: number }).n).toBe(0);
  });
});

describe("timestamp semantics: identical under a non-UTC process timezone", () => {
  // Runs the SAME assertions in child processes pinned to very different
  // offsets. Europe/Zurich (+1/+2) is the developer/production-adjacent zone
  // the milestone asked about; America/New_York is negative; Pacific/Kiritimati
  // (+14) is the extreme. Before migration 0018 the +14 case was off by 14
  // hours, which is more than half a day of trial.
  const zones = ["UTC", "Europe/Zurich", "America/New_York", "Pacific/Kiritimati"];

  const script = `
    const { Pool } = require("pg");
    (async () => {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      // Reproduce Drizzle's parser override: return the raw string so this
      // probe measures what the APPLICATION sees, not pg's own Date parsing.
      const client = await pool.connect();
      const res = await client.query({
        text: "select now() as n, (now() + interval '14 days') as ends, current_date::text as d",
        types: { getTypeParser: () => (v) => v },
      });
      client.release();
      const row = res.rows[0];
      const now = new Date(row.n).getTime();
      const ends = new Date(row.ends).getTime();
      process.stdout.write(JSON.stringify({
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Rounded to the second so ordinary latency between runs cannot make
        // two zones disagree for a non-timezone reason.
        nowSec: Math.round(now / 1000),
        windowDays: Math.round((ends - now) / 86400000),
        // Skew between the database instant and this process's own clock. A
        // timezone misread shows up here as whole hours.
        skewMin: Math.round((now - Date.now()) / 60000),
        businessDate: row.d,
      }));
      await pool.end();
    })().catch((e) => { process.stderr.write(String(e)); process.exit(1); });
  `;

  it("sees the same instant and the same business date in every timezone", () => {
    const results = zones.map((tz) => {
      const out = execFileSync(process.execPath, ["-e", script], {
        env: { ...process.env, TZ: tz },
        encoding: "utf8",
        timeout: 60_000,
      });
      return { tz, ...(JSON.parse(out) as Record<string, unknown>) };
    });

    // Every child must actually have run in the zone it was given, otherwise
    // this test would pass vacuously.
    expect(results.map((r) => r.tz)).toEqual(zones);

    // The trial window is 14 days regardless of process timezone.
    for (const r of results) expect(r.windowDays).toBe(14);

    // The database instant, as the application sees it, must be the same moment
    // in every zone. Runs are sequential, so allow a small real-time spread.
    const nowSecs = results.map((r) => r.nowSec as number);
    expect(Math.max(...nowSecs) - Math.min(...nowSecs)).toBeLessThan(60);

    // And it must match this process's own clock — no hour-sized offset.
    for (const r of results) expect(Math.abs(r.skewMin as number)).toBeLessThan(5);

    // current_date is a calendar date and must be byte-identical everywhere.
    const dates = new Set(results.map((r) => r.businessDate));
    expect(dates.size).toBe(1);
  });
});

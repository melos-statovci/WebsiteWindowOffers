import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { readE2eFixtureConfig } from "../../scripts/e2e-guard";
import { createTrustedProvisionedOrganization } from "../../src/server/provisioning";
import { TestCleanup } from "../../src/db/testing/fixtures";

const baseURL = "http://localhost:3000";
const run = randomUUID().slice(0, 8);
const password = `Synthetic-${randomUUID()}`;
const emails = new Set<string>();
const contexts: APIRequestContext[] = [];
let pool: pg.Pool;
let cleanup: TestCleanup;
let orgId = "";
let ownerId = "";
let invitationId = "";
const users: Record<string, { email: string; id: string; api: APIRequestContext }> = {};
const trial = { companyName: "Synthetic application", phone: "+38344111222", country: "Kosovo", companySize: "1-5", formStartedAt: Date.now() - 10_000 };
const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")) as { node: Record<string, { exportedName: string }> };
function actionId(name: string): string {
  const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
  if (!entry) throw new Error(`Missing built server action ${name}`);
  return entry[0];
}
async function action(api: APIRequestContext, name: string, path: string, input: unknown) {
  const response = await api.post(path, { headers: { "Next-Action": actionId(name), "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component", Origin: baseURL }, data: JSON.stringify([input]) });
  expect(response.ok()).toBe(true);
  const serialized = await response.text();
  const line = serialized.split("\n").find((row) => row.startsWith("1:"));
  if (!line) throw new Error("Missing serialized action result");
  return { serialized, value: JSON.parse(line.slice(2)) };
}
async function signup(who: string) {
  const email = cleanup.userEmail(`kornizo-e2e-rem-${run}-${who}@example.test`);
  emails.add(email);
  const api = await playwrightRequest.newContext({ baseURL }); contexts.push(api);
  const send = () => api.post("/api/auth/sign-up/email", { headers: { Origin: baseURL }, data: { name: `Synthetic ${who}`, email, password } });
  let response = await send();
  if (response.status() === 429) {
    const seconds = Math.min(30, Math.max(1, Number(response.headers()["retry-after"]) || 10));
    await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
    response = await send();
  }
  if (!response.ok()) {
    const failure = await response.json() as { code?: string };
    throw new Error(`Synthetic signup ${who}: HTTP ${response.status()} code=${failure.code ?? "UNKNOWN"}`);
  }
  const body = await response.json() as { user: { id: string } };
  return { email, id: body.user.id, api };
}

test.beforeAll(async () => {
  const config = readE2eFixtureConfig();
  if (new URL(process.env.BETTER_AUTH_URL!).origin !== baseURL) throw new Error("Browser regression requires local Better Auth origin");
  pool = new pg.Pool({ connectionString: config.ownerDatabaseUrl }); cleanup = new TestCleanup(pool);
  for (const role of ["owner", "platform", "dual", "applicant"]) users[role] = await signup(role);
  ownerId = users.owner.id;
  const org = await createTrustedProvisionedOrganization({ userId: ownerId, name: `Synthetic E2E ${run}`, slug: `e2e-rem-${run}` });
  orgId = cleanup.org(org.id);
  await pool.query("insert into member(organization_id,user_id,role,created_at) values($1,$2,'sales',now())", [orgId, users.dual.id]);
  for (const who of ["platform", "dual"]) await pool.query("insert into platform_admins(user_id,email,note) values($1,$2,'synthetic browser regression')", [users[who].id, users[who].email]);
  for (const who of ["owner", "dual"]) expect((await users[who].api.post("/api/auth/organization/set-active", { headers: { Origin: baseURL }, data: { organizationId: orgId } })).ok()).toBe(true);
  invitationId = randomUUID();
  await pool.query("insert into invitation(id,organization_id,email,role,status,expires_at,inviter_id) values($1,$2,$3,'sales','pending',now()+interval '1 day',$4)", [invitationId, orgId, `invite-e2e-${run}@example.test`, ownerId]);
});

test.afterAll(async () => {
  if (pool) {
    await pool.query("delete from platform_audit_events where organization_id=$1 or actor_user_id=any($2::uuid[])", [orgId || null, Object.values(users).map((u) => u.id)]);
    await pool.query("delete from contact_requests where normalized_email=any($1::text[])", [[...emails]]);
    await cleanup.run();
    await pool.end();
  }
  await Promise.all(contexts.map((api) => api.dispose()));
});

for (const intent of ["general", "demo"] as const) {
  test(`RC-01 ${intent}: new, duplicate and concurrent HTTP replies reveal no stored row`, async ({ request }) => {
    const email = `e2e-${intent}-${run}@example.test`; emails.add(email);
    const name = intent === "demo" ? "submitDemoRequest" : "submitGeneralContactRequest";
    const path = intent === "demo" ? "/request-demo" : "/contact";
    const input = { ...trial, name: `PRIVATE_NAME_${run}`, email, message: `PRIVATE_MESSAGE_${run}` };
    const first = await action(request, name, path, input);
    expect(first.value).toEqual({ ok: true, data: { accepted: true } });
    const row = (await pool.query("select id from contact_requests where normalized_email=$1 and intent=$2", [email, intent])).rows[0];
    await pool.query("update contact_requests set status='contacted' where id=$1", [row.id]);
    const duplicate = await action(request, name, path, { ...input, name: "Different visitor", message: "Different question for support" });
    expect(duplicate.value).toEqual(first.value);
    expect(duplicate.serialized).not.toContain(row.id);
    expect(duplicate.serialized).not.toContain(`PRIVATE_NAME_${run}`);
    expect(duplicate.serialized).not.toContain(`PRIVATE_MESSAGE_${run}`);
    const raceEmail = `e2e-race-${intent}-${run}@example.test`; emails.add(raceEmail);
    const race = await Promise.all([action(request, name, path, { ...input, email: raceEmail }), action(request, name, path, { ...input, email: raceEmail })]);
    for (const result of race) expect(result.value).toEqual(first.value);
    expect((await pool.query("select id from contact_requests where normalized_email=$1 and intent=$2", [raceEmail, intent])).rows).toHaveLength(1);
  });
}

test("RC-02 direct organization deletion preserves organization, members and invitations", async () => {
  const snapshot = async () => (await pool.query(`select row_to_json(o) org,
    (select jsonb_agg(to_jsonb(m) order by id) from member m where organization_id=o.id) members,
    (select jsonb_agg(to_jsonb(i) order by id) from invitation i where organization_id=o.id) invitations
    from organization o where id=$1`, [orgId])).rows[0];
  const before = await snapshot();
  const response = await users.owner.api.post("/api/auth/organization/delete", { headers: { Origin: baseURL }, data: { organizationId: orgId } });
  expect(response.ok()).toBe(false);
  expect(await snapshot()).toEqual(before);
});

test("RC-04 private review values are absent from applicant HTTP action and page serialization", async () => {
  const submitted = await action(users.applicant.api, "submitTrialApplication", "/request-trial", trial);
  expect(submitted.value.ok).toBe(true);
  await pool.query("update trial_applications set internal_review_note=$1, reviewed_by_email=$2 where user_id=$3", [`PRIVATE_REVIEW_${run}`, `PRIVATE_REVIEWER_${run}@example.test`, users.applicant.id]);
  const duplicate = await action(users.applicant.api, "submitTrialApplication", "/request-trial", trial);
  const status = await users.applicant.api.get("/application-status");
  const form = await users.applicant.api.get("/request-trial");
  for (const body of [duplicate.serialized, await status.text(), await form.text()]) {
    expect(body).not.toMatch(/PRIVATE_REVIEW_|PRIVATE_REVIEWER_|internalReviewNote|reviewedByEmail/);
  }
});

test("RC-20 and RC-23 English signup recovers from application rejection without another signup", async ({ page }) => {
  const email = cleanup.userEmail(`e2e-retry-${run}@example.test`); emails.add(email);
  let signupRequests = 0;
  let injected = false;
  page.on("request", (req) => { if (req.url().endsWith("/api/auth/sign-up/email")) signupRequests++; });
  await page.route("**/en/request-trial", async (route) => {
    if (!injected && route.request().headers()["next-action"] === actionId("submitTrialApplication")) {
      injected = true;
      const body = JSON.parse(route.request().postData()!) as Record<string, unknown>[];
      body[0].companyName = "x"; // Real server validation fails AFTER real signup succeeds.
      await route.continue({ postData: JSON.stringify(body) });
    } else await route.continue();
  });
  await page.goto("/en/request-trial");
  const name = page.getByRole("textbox", { name: "Your name", exact: true });
  expect(await name.evaluate((node) => node.closest("[lang]")?.getAttribute("lang"))).toBe("en");
  await name.fill("Synthetic retry");
  await page.getByRole("textbox", { name: "Business email", exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("textbox", { name: "Company name", exact: true }).fill("Preserved company");
  await page.getByRole("textbox", { name: "Phone", exact: true }).fill("+38344111222");
  await page.getByRole("textbox", { name: "Country", exact: true }).fill("Kosovo");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Check the company details and try again.");
  expect(signupRequests).toBe(1);
  await expect(page.getByRole("textbox", { name: "Company name", exact: true })).toHaveValue("Preserved company");
  await page.getByRole("textbox", { name: "Company name", exact: true }).fill("Corrected company");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page).toHaveURL(/\/en\/application-status$/);
  expect(signupRequests).toBe(1);
  const stored = await pool.query('select t.status,t.company_name from trial_applications t join "user" u on u.id=t.user_id where u.email=$1', [email]);
  expect(stored.rows).toEqual([{ status: "pending", company_name: "Corrected company" }]);
});

for (const [who, path] of [["platform", "/platform"], ["owner", "/dashboard"], ["dual", "/platform"]] as const) {
  test(`RC-20/24 ${who} signs in with accessible controls and lands on ${path}`, async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(users[who].email);
    await page.getByLabel("Fjalëkalimi", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Kyçu", exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}${path}`);
    await page.waitForLoadState("networkidle");
  });
}

test("RC-11 tenant pricing exposes only effective editors and a saved glass price changes a new calculation", async ({ page, context }) => {
  const client = await action(users.owner.api, "createClient", "/clients", { name: "RC-11 pricing probe", type: "Privat" });
  const project = await action(users.owner.api, "createProject", "/projects", { clientId: client.value.data.id, title: "RC-11 pricing sensitivity", vatRate: 0.18 });
  expect(project.value.ok).toBe(true);
  const config = {
    productType: "Dritare",
    modelType: "njeshe",
    widthMm: 1000,
    heightMm: 1200,
    systemId: "s1",
    color: "white",
    mechanismId: "Roto NX",
    glassId: "g1",
    roleta: false,
    shtesa: [],
    openings: {},
  };
  const baseline = await action(users.owner.api, "addProjectItem", `/projects/${project.value.data.id}/configure`, {
    projectId: project.value.data.id,
    config,
    qty: 1,
  });
  expect(baseline.value.ok).toBe(true);

  await context.addCookies((await users.owner.api.storageState()).cookies);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/pricing?tab=glass");
  await expect(page.locator("html")).toHaveClass(/dark/);

  for (const label of ["Sistemet", "Armimi", "Xhamat", "Llajsnet", "Roletat"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  for (const label of ["Mekanizmat", "Panelet", "Shtesat", "Parametrat", "Dyer të Hyrjes"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
  }

  const glassPrice = page.getByRole("textbox", { name: /Dopjo Low-E 4-16-4 €\/m²/ });
  const originalGlassPrice = Number(await glassPrice.inputValue());
  await glassPrice.fill(String(originalGlassPrice + 10));
  await page.getByRole("button", { name: /Ruaj Ndryshimet/ }).click();
  await expect(page.getByText("Ndryshimet u ruajtën.", { exact: true })).toBeVisible();

  const changed = await action(context.request, "addProjectItem", `/projects/${project.value.data.id}/configure`, {
    projectId: project.value.data.id,
    config,
    qty: 1,
  });
  expect(changed.value.ok).toBe(true);
  expect(changed.value.data.unitPrice - baseline.value.data.unitPrice).toBeCloseTo(9.7, 2);

  await page.getByRole("button", { name: "Kalo në ditë", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing");
  await expect(page.getByRole("button", { name: "Sistemet", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Roletat", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Kalo në natë", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});


test("RC-03 stored invoice content prints safely through the real popup UI", async ({ page, context }) => {
  const hostile = `<img src=x onerror="globalThis.__storedPrintProbe=1">'" &`;
  const client = await action(users.owner.api, "createClient", "/clients", { name: hostile, type: "Privat" });
  expect(client.value.ok).toBe(true);
  const invoice = await action(users.owner.api, "createManualInvoice", "/invoices", { clientId: client.value.data.id, issuedAt: "2026-09-14", dueAt: "2026-09-15", vatRate: 0.18, status: "Dërguar", reference: hostile, lines: [{ description: hostile, qty: 1, unitPrice: 10 }] });
  expect(invoice.value.ok).toBe(true);
  await context.addCookies((await users.owner.api.storageState()).cookies);
  await page.goto(`/invoices/${invoice.value.data.id}`);
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Printo", exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  expect(await popup.evaluate(() => Reflect.get(globalThis, "__storedPrintProbe"))).toBeUndefined();
  await expect(popup.locator("img,script,[onerror]")).toHaveCount(0);
  await expect(popup.locator("body")).toContainText(hostile);
  expect(await popup.locator("body").innerText()).not.toMatch(/50%|5.vjet|2.vjet/);
  await popup.close();
  await page.getByRole("button", { name: "Shto pagesë", exact: true }).click();
  const amount = page.getByRole("textbox", { name: "Shuma (€) *", exact: true });
  await amount.fill("0");
  await page.getByRole("button", { name: "Ruaj pagesën", exact: true }).click();
  await expect(amount).toHaveAttribute("aria-describedby", "payment-error");
  await expect(page.locator("#payment-error")).toHaveAttribute("role", "alert");
  await expect(page.getByRole("combobox", { name: "Mënyra e pagesës" })).toBeVisible();
});

test("RC-09 accepted offer rejects a serialized commercial edit", async ({ page, context }) => {
  const client = await action(users.owner.api, "createClient", "/clients", { name: "Accepted offer probe", type: "Privat" });
  const project = await action(users.owner.api, "createProject", "/projects", { clientId: client.value.data.id, title: "Immutable accepted terms", vatRate: 0.18 });
  expect(project.value.ok).toBe(true);
  const id = project.value.data.id;
  expect((await action(users.owner.api, "setProjectStatus", "/projects", { id, status: "Pranuar" })).value.ok).toBe(true);
  await context.addCookies((await users.owner.api.storageState()).cookies);
  await page.goto("/projects");
  await expect(page.getByText("Immutable accepted terms", { exact: true })).toBeVisible();
  expect((await action(context.request, "updateProject", "/projects", { id, title: "Stale edit", vatRate: 0.2 })).value)
    .toMatchObject({ ok: false, error: { code: "RULE_VIOLATION" } });
  expect((await pool.query("select title from projects where id=$1", [id])).rows[0].title).toBe("Immutable accepted terms");
});

test("RC-08 platform UI extends then activates, and refuses any later extension", async ({ page, context }) => {
  await context.addCookies((await users.platform.api.storageState()).cookies);
  await page.goto(`/platform/organizations/${orgId}`);
  await page.getByRole("button", { name: "Llogaria", exact: true }).click();
  const before = (await pool.query("select trial_ends_at from organization_accounts where organization_id=$1", [orgId])).rows[0].trial_ends_at as Date;
  await page.getByRole("button", { name: "+7 ditë", exact: true }).click();
  await expect.poll(async () => (await pool.query("select trial_ends_at from organization_accounts where organization_id=$1", [orgId])).rows[0].trial_ends_at.getTime())
    .toBe(before.getTime() + 7 * 86400000);
  await page.getByRole("button", { name: "Aktivizo klientin", exact: true }).click();
  await expect(page.getByText("Klienti është aktiv. Skadimi i trial nuk kufizon qasjen.")).toBeVisible();
  expect((await action(context.request, "extendOrganizationTrial", `/platform/organizations/${orgId}`, { organizationId: orgId, days: 7 })).value)
    .toMatchObject({ ok: false, error: { code: "RULE_VIOLATION" } });
});


test("RC-20 English contact submission announces success with associated controls", async ({ page }) => {
  const email = `e2e-contact-ui-${run}@example.test`; emails.add(email);
  await page.goto("/en/contact");
  await page.getByRole("textbox", { name: "Your name", exact: true }).fill("Synthetic contact");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Your question", exact: true }).fill("Synthetic accessibility question");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator("form").getByRole("status")).toHaveText("Message sent. We will get back to you.");
});

// PLATFORM mutation cores — change plan, suspend/reactivate, edit internal note.
// Each composes through createPlatformAction (validate -> authenticate -> verify
// PLATFORM ADMIN -> handler). Writes target the non-RLS control-plane table
// organization_accounts, upserted by organization id (the row is guaranteed by
// backfill/hook, but ON CONFLICT keeps this robust). No tenant business data is
// ever touched — suspension is purely an access-state flag.

import { sql } from "drizzle-orm";
import {
  setPlanSchema,
  setStatusSchema,
  setInternalNoteSchema,
} from "@/domain/validation/platform";
import { createPlatformAction, assertOrganizationExists } from "@/server/platform/action";

const PLATFORM_PATHS = (orgId: string) => ["/platform", "/platform/organizations", `/platform/organizations/${orgId}`];

/** Manually set an organization's plan tier. Immediately respected by tenant gates. */
export const setPlanAction = createPlatformAction({
  input: setPlanSchema,
  revalidate: [],
  handler: async ({ input, db }) => {
    await assertOrganizationExists(input.organizationId);
    await db.execute(sql`
      insert into organization_accounts (organization_id, plan)
      values (${input.organizationId}, ${input.plan})
      on conflict (organization_id) do update set plan = ${input.plan}, updated_at = now()
    `);
    return { organizationId: input.organizationId, plan: input.plan, revalidate: PLATFORM_PATHS(input.organizationId) };
  },
});

/** Suspend or reactivate an organization. Suspension stamps time+reason; reactivation clears them. */
export const setStatusAction = createPlatformAction({
  input: setStatusSchema,
  revalidate: [],
  handler: async ({ input, db }) => {
    await assertOrganizationExists(input.organizationId);
    if (input.status === "suspended") {
      await db.execute(sql`
        insert into organization_accounts (organization_id, status, suspended_at, suspended_reason)
        values (${input.organizationId}, 'suspended', now(), ${input.reason ?? null})
        on conflict (organization_id) do update
          set status = 'suspended', suspended_at = now(), suspended_reason = ${input.reason ?? null}, updated_at = now()
      `);
    } else {
      await db.execute(sql`
        insert into organization_accounts (organization_id, status)
        values (${input.organizationId}, 'active')
        on conflict (organization_id) do update
          set status = 'active', suspended_at = null, suspended_reason = null, updated_at = now()
      `);
    }
    return { organizationId: input.organizationId, status: input.status };
  },
});

/** Maintain a private control-plane note (invisible to tenant members). */
export const setInternalNoteAction = createPlatformAction({
  input: setInternalNoteSchema,
  revalidate: [],
  handler: async ({ input, db }) => {
    await assertOrganizationExists(input.organizationId);
    const note = input.note.length ? input.note : null;
    await db.execute(sql`
      insert into organization_accounts (organization_id, internal_note)
      values (${input.organizationId}, ${note})
      on conflict (organization_id) do update set internal_note = ${note}, updated_at = now()
    `);
    return { organizationId: input.organizationId };
  },
});

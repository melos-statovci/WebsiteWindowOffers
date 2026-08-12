// Reference business action: UPDATE ORGANIZATION PROFILE. This is the TEMPLATE
// every Phase 4+ business mutation will copy. It exercises the full spine via
// createAction: Zod validation -> auth -> trusted active org -> authorize
// (settings:edit, i.e. owner/admin) -> withOrg RLS transaction -> typed result.
//
// The tenant is ALWAYS ctx.organizationId (session-derived); any organization id
// in the input is ignored, and RLS is the backstop.

import { eq } from "drizzle-orm";
import { organizationProfiles } from "@/db/schema/business";
import { organizationProfileUpdateSchema } from "@/domain/validation/organization-profile";
import { createAction, fail } from "@/server/action";

type ProfileInsert = typeof organizationProfiles.$inferInsert;

export const updateOrganizationProfileAction = createAction({
  input: organizationProfileUpdateSchema,
  permission: { settings: ["edit"] },
  revalidate: ["/settings"],
  handler: async ({ input, ctx, tx }) => {
    const patch: Partial<ProfileInsert> = { updatedAt: new Date() };
    if (input.nui !== undefined) patch.nui = input.nui;
    if (input.vatNo !== undefined) patch.vatNo = input.vatNo;
    if (input.address !== undefined) patch.address = input.address;
    if (input.city !== undefined) patch.city = input.city;
    if (input.postalCode !== undefined) patch.postalCode = input.postalCode;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.businessEmail !== undefined) patch.businessEmail = input.businessEmail;
    if (input.bank !== undefined) patch.bank = input.bank;
    if (input.swift !== undefined) patch.swift = input.swift;
    if (input.iban !== undefined) patch.iban = input.iban;
    // numeric columns are strings in drizzle.
    if (input.marginDefault !== undefined) patch.marginDefault = String(input.marginDefault);
    if (input.vatDefault !== undefined) patch.vatDefault = String(input.vatDefault);

    const rows = await tx
      .update(organizationProfiles)
      .set(patch)
      .where(eq(organizationProfiles.organizationId, ctx.organizationId))
      .returning({ organizationId: organizationProfiles.organizationId });

    // 0 rows = the row doesn't exist OR is hidden by RLS (another tenant). Either
    // way we return NOT_FOUND and disclose nothing about other tenants.
    if (rows.length === 0) throw fail("NOT_FOUND", "Profili i organizatës nuk u gjet.");

    return { organizationId: rows[0].organizationId };
  },
});

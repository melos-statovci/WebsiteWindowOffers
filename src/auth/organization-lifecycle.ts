import { APIError } from "better-auth/api";
import { accountUnavailableReason } from "@/lib/account-lifecycle";
import { getAccountState } from "@/server/platform/accounts";

/**
 * Add Kornizo lifecycle availability on top of Better Auth's own organization
 * authorization. Call only from mutation paths classified as lifecycle-gated.
 */
export async function requireUsableOrganizationAccount(organizationId: string): Promise<void> {
  const account = await getAccountState(organizationId);
  if (!accountUnavailableReason(account)) return;

  throw APIError.from("FORBIDDEN", {
    code: "ORGANIZATION_ACCOUNT_UNAVAILABLE",
    message: "Organization account is unavailable.",
  });
}

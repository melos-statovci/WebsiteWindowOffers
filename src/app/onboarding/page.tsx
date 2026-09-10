import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";

// Legacy no-org landing. Self-service tenant creation is closed for launch:
// account-only users continue through Trial Application status/request flow.
export default async function OnboardingPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) redirect("/sign-in");
  const orgs = await auth.api.listOrganizations({ headers: h });
  if (orgs && orgs.length > 0) redirect("/dashboard");
  const existing = await db.execute(sql`select 1 from trial_applications where user_id = ${session.user.id} limit 1`);
  redirect(existing.rows.length > 0 ? "/application-status" : "/request-trial");
}

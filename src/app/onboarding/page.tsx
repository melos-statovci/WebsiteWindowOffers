import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { OnboardingForm } from "./onboarding-form";

// Safe fallback for an authenticated user with NO organization (fresh account
// whose org creation failed, or someone removed from their only org). Not a full
// onboarding flow — just a reliable way to (re)create an organization.
export default async function OnboardingPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) redirect("/sign-in");
  const orgs = await auth.api.listOrganizations({ headers: h });
  if (orgs && orgs.length > 0) redirect("/dashboard");
  return <OnboardingForm />;
}

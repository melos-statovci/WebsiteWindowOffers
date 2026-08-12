import { redirect } from "next/navigation";
import { getSession } from "@/auth/session";
import { SignInForm } from "./sign-in-form";

// Server-validated: a genuinely signed-in user is sent on; a stale/invalid
// cookie (getSession null) falls through to the form — so no redirect loop.
export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <SignInForm />;
}

import { redirect } from "next/navigation";
import { getSession } from "@/auth/session";
import { signInDestination } from "@/auth/sign-in-destination";
import { SignInForm } from "./sign-in-form";

// Server-validated: a genuinely signed-in user is sent on; a stale/invalid
// cookie (getSession null) falls through to the form — so no redirect loop.
export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect(await signInDestination(session.user.id));
  return <SignInForm />;
}

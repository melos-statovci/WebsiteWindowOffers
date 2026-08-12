import { redirect } from "next/navigation";
import { getSession } from "@/auth/session";
import { SignUpForm } from "./sign-up-form";

// A genuinely signed-in user skips sign-up; a stale cookie falls through to the
// form (no redirect loop).
export default async function SignUpPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <SignUpForm />;
}

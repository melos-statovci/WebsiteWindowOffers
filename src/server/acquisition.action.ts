"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  activateProvisionedOrganizationAction,
  submitDemoRequestAction,
  submitTrialApplicationAction,
} from "@/server/acquisition";
import type {
  DemoRequestSubmitInput,
  TrialApplicationSubmitInput,
} from "@/domain/validation/acquisition";

export async function submitTrialApplication(input: TrialApplicationSubmitInput) {
  const res = await submitTrialApplicationAction(input, await headers());
  if (res.ok) {
    revalidatePath("/application-status");
    revalidatePath("/en/application-status");
    revalidatePath("/platform");
    revalidatePath("/platform/applications");
  }
  return res;
}

/**
 * "Start using Kornizo" — the applicant activates THEIR OWN provisioned
 * organization in THEIR OWN session. Takes no input by design.
 */
export async function activateProvisionedOrganization() {
  const res = await activateProvisionedOrganizationAction(await headers());
  if (res.ok) {
    revalidatePath("/application-status");
    revalidatePath("/en/application-status");
    revalidatePath("/dashboard");
  }
  return res;
}

export async function submitDemoRequest(input: DemoRequestSubmitInput) {
  const res = await submitDemoRequestAction(input);
  if (res.ok) {
    revalidatePath("/platform");
    revalidatePath("/platform/applications");
  }
  return res;
}

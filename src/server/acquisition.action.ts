"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  activateProvisionedOrganizationAction,
  submitDemoContactRequestAction,
  submitGeneralContactRequestAction,
  submitTrialApplicationAction,
} from "@/server/acquisition";
import type {
  DemoContactRequestInput,
  GeneralContactRequestInput,
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

/** "Request a demo" — a contact request with intent 'demo'. No account, no tenant. */
export async function submitDemoRequest(input: DemoContactRequestInput) {
  const res = await submitDemoContactRequestAction(input);
  if (res.ok) {
    revalidatePath("/platform");
    revalidatePath("/platform/applications");
  }
  return res;
}

/** "Contact Kornizo" — a contact request with intent 'general'. No account, no tenant. */
export async function submitGeneralContactRequest(input: GeneralContactRequestInput) {
  const res = await submitGeneralContactRequestAction(input);
  if (res.ok) {
    revalidatePath("/platform");
    revalidatePath("/platform/applications");
  }
  return res;
}

"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  retryTrialApplicationProvisioningAction,
  reviewTrialApplicationAction,
  setContactRequestStatusAction,
} from "@/server/platform/actions/applications";
import type {
  RetryTrialApplicationProvisioningInput,
  ReviewTrialApplicationInput,
  SetContactRequestStatusInput,
} from "@/domain/validation/acquisition";

function revalidateApplications() {
  revalidatePath("/platform");
  revalidatePath("/platform/applications");
  revalidatePath("/platform/activity");
  // A successful approval creates a new organization, so the platform
  // organization views are stale too.
  revalidatePath("/platform/organizations");
}

export async function reviewTrialApplication(input: ReviewTrialApplicationInput) {
  const res = await reviewTrialApplicationAction(input, await headers());
  if (res.ok) {
    revalidateApplications();
    revalidatePath(`/platform/applications/trial/${input.id}`);
  }
  return res;
}

export async function retryTrialApplicationProvisioning(input: RetryTrialApplicationProvisioningInput) {
  const res = await retryTrialApplicationProvisioningAction(input, await headers());
  if (res.ok) {
    revalidateApplications();
    revalidatePath(`/platform/applications/trial/${input.id}`);
  }
  return res;
}

export async function setContactRequestStatus(input: SetContactRequestStatusInput) {
  const res = await setContactRequestStatusAction(input, await headers());
  if (res.ok) {
    revalidateApplications();
    revalidatePath(`/platform/applications/contact/${input.id}`);
  }
  return res;
}

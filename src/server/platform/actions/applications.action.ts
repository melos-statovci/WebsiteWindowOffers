"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  reviewTrialApplicationAction,
  setDemoRequestStatusAction,
} from "@/server/platform/actions/applications";
import type {
  ReviewTrialApplicationInput,
  SetDemoRequestStatusInput,
} from "@/domain/validation/acquisition";

function revalidateApplications() {
  revalidatePath("/platform");
  revalidatePath("/platform/applications");
  revalidatePath("/platform/activity");
}

export async function reviewTrialApplication(input: ReviewTrialApplicationInput) {
  const res = await reviewTrialApplicationAction(input, await headers());
  if (res.ok) {
    revalidateApplications();
    revalidatePath(`/platform/applications/trial/${input.id}`);
  }
  return res;
}

export async function setDemoRequestStatus(input: SetDemoRequestStatusInput) {
  const res = await setDemoRequestStatusAction(input, await headers());
  if (res.ok) revalidateApplications();
  return res;
}

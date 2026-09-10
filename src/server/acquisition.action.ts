"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
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

export async function submitDemoRequest(input: DemoRequestSubmitInput) {
  const res = await submitDemoRequestAction(input);
  if (res.ok) {
    revalidatePath("/platform");
    revalidatePath("/platform/applications");
  }
  return res;
}

import { isPlatformAdmin } from "@/server/platform/auth";

export async function signInDestination(userId: string): Promise<"/platform" | "/dashboard"> {
  return await isPlatformAdmin(userId) ? "/platform" : "/dashboard";
}

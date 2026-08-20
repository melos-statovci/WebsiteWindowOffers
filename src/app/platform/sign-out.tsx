"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/auth/client";

/** Sign-out control styled for the dark platform chrome. */
export function PlatformSignOut() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
      className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
    >
      Dilni
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/auth/client";
import { Button } from "@/components/ui/kit";

/** Minimal sign-out control for the suspended screen. */
export function SuspendedSignOut() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
    >
      Dilni
    </Button>
  );
}

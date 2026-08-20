"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/auth/client";
import { Button } from "@/components/ui/kit";

/** Sign-out control for the platform chrome. */
export function PlatformSignOut() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
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

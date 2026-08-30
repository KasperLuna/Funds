"use client";

import { useRouter } from "next/navigation";
import { signOutAndWipe } from "@/lib/sync/sign-out";
import { Button } from "@/components/ui/button";

export const SignOutButton = () => {
  const router = useRouter();

  async function handleSignOut() {
    await signOutAndWipe();
    router.push("/");
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" onClick={() => void handleSignOut()}>
      Sign out
    </Button>
  );
};

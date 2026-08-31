"use client";

import { useRouter } from "next/navigation";
import { signOutAndWipe } from "@/lib/sync/sign-out";
import { useChat } from "@/components/assistant/use-chat";
import { Button } from "@/components/ui/button";

export const SignOutButton = () => {
  const router = useRouter();
  const { reset } = useChat();

  async function handleSignOut() {
    reset();
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

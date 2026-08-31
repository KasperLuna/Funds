"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOutAndWipe } from "@/lib/sync/sign-out";
import { useChat } from "@/components/assistant/use-chat";

export const SidebarSignOut = () => {
  const router = useRouter();
  const { reset } = useChat();

  async function handleSignOut() {
    reset();
    await signOutAndWipe();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="flex min-h-11 items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-(--surface-3) hover:text-inherit"
    >
      <LogOut className="h-5 w-5" aria-hidden />
      <span className="hidden md:inline">Sign out</span>
    </button>
  );
};

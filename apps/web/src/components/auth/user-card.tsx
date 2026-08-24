"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function UserCard() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div
        aria-label="Account"
        className="mb-3 flex items-center justify-between gap-2 border-b border-(--border) pb-3"
      >
        <span className="text-sm text-zinc-500">Loading…</span>
      </div>
    );
  }

  const user = session?.user;

  if (!user) {
    return (
      <div
        aria-label="Account"
        className="mb-3 flex items-center justify-between gap-2 border-b border-(--border) pb-3"
      >
        <span className="text-sm text-zinc-500">Signed out</span>
        <Link href="/signin" className="text-sm text-(--accent)">
          Sign in
        </Link>
      </div>
    );
  }

  const username = (user as { username?: string }).username;
  return (
    <div
      aria-label="Account"
      className="mb-3 flex items-center justify-between gap-2 border-b border-(--border) pb-3"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{username || user.name}</p>
        <p className="truncate text-xs text-zinc-500">{user.email}</p>
      </div>
    </div>
  );
}

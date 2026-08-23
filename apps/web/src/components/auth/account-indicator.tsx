"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";

function useUser() {
  const { data: session, isPending } = useSession();
  return { user: session?.user ?? null, isPending };
}

export function AccountChip() {
  const { user, isPending } = useUser();

  if (isPending) {
    return (
      <span
        aria-hidden
        className="h-8 w-8 rounded-(--radius-md) bg-(--surface-3)"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/signin"
        className="inline-flex h-8 items-center rounded-(--radius-md) border border-(--accent)/50 px-2.5 text-xs font-semibold text-(--accent)"
      >
        Sign in
      </Link>
    );
  }

  const initial = (
    (user as { username?: string }).username ?? user.name ?? "U"
  )
    .trim()
    .slice(0, 1)
    .toUpperCase();
  const label = (user as { username?: string }).username ?? user.name ?? "Account";

  return (
    <Link
      href="/dashboard/settings"
      aria-label={`Account: ${label}`}
      className="grid h-8 w-8 place-items-center rounded-(--radius-md) border border-(--border) bg-(--surface-3) text-xs font-bold text-inherit"
    >
      {initial}
    </Link>
  );
}

export function SignedOutBanner() {
  const { user, isPending } = useUser();

  if (isPending || user) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-(--radius-md) border border-(--warning)/40 bg-(--surface-2) px-3 py-2.5">
      <p className="text-xs leading-snug text-zinc-300">
        <span className="font-semibold text-(--warning)">Not signed in</span>
        {" — data stays on this device and won't sync."}
      </p>
      <Link
        href="/signin"
        className="shrink-0 rounded-(--radius-sm) border border-(--border-strong) px-2.5 py-1 text-xs font-semibold"
      >
        Sign in
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import {
  NavStatusReporter,
  useOptimisticNavigate,
} from "@/components/app-shell/optimistic-nav";

function useUser() {
  const { data: session, isPending } = useSession();
  return { user: session?.user ?? null, isPending };
}

export const AccountChip = () => {
  const { user, isPending } = useUser();
  const navigate = useOptimisticNavigate();
  // cavetail: next/link wraps onClick in startTransition, which the scheduler
  // can defer past a cold iOS PWA open — the tap is eaten. Navigate
  // synchronously via router.push in the same task; the Link still prefetches.
  const goSettings = (e: React.SyntheticEvent) => {
    e.preventDefault();
    navigate("/dashboard/settings", { scroll: false });
  };

  if (isPending) {
    return (
      <Link
        href="/dashboard/settings"
        prefetch
        onClick={goSettings}
        aria-busy
        aria-label="Account"
        className="grid min-h-11 min-w-11 animate-pulse place-items-center rounded-(--radius-md) border border-(--border) bg-(--surface-3) text-xs font-bold text-zinc-100"
      >
        <NavStatusReporter href="/dashboard/settings" />
        <User className="h-4 w-4" aria-hidden />
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        href="/signin"
        className="inline-flex min-h-11 items-center rounded-(--radius-md) border border-(--accent)/50 px-2.5 text-xs font-semibold text-(--accent)"
      >
        Sign in
      </Link>
    );
  }

  // cavetail: username defaults to "" (see server/auth.ts additionalFields),
  // and ?? keeps empty strings — skip blanks or an empty username shadows a
  // real name and the chip degrades to "U".
  const rawLabel =
    [
      (user as { username?: string }).username,
      user.name,
      user.email,
    ].find((s): s is string => !!s && s.trim().length > 0) ?? "U";
  const initial = rawLabel.trim().slice(0, 1).toUpperCase();
  const label = rawLabel.trim();

  return (
    <Link
      href="/dashboard/settings"
      prefetch
      onClick={goSettings}
      aria-label={`Account: ${label}`}
      className="grid min-h-11 min-w-11 place-items-center rounded-(--radius-md) border border-(--border) bg-(--surface-3) text-xs font-bold text-zinc-100"
    >
      <NavStatusReporter href="/dashboard/settings" />
      {initial}
    </Link>
  );
};

export const SignedOutBanner = () => {
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
};

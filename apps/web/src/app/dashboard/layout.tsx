"use client";

import { Settings, LogOut, Plus, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NAV_ITEMS, NavLink, MobileTab, SyncPill, AddButton } from "@/components/app-shell/shell-nav";
import { FundsLogo } from "@/components/brand/funds-logo";
import { UserCard } from "@/components/auth/user-card";
import { AccountChip, SignedOutBanner } from "@/components/auth/account-indicator";
import { PrivacyProvider, usePrivacy } from "@/lib/privacy/privacy-context";
import { SyncProvider } from "@/lib/sync/sync-context";

function PrivacyToggle() {
  const { masked, toggle } = usePrivacy();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={masked ? "Reveal amounts" : "Hide amounts"}
      className="flex items-center justify-center gap-1 rounded-(--radius-md) p-2 transition-colors text-zinc-500 hover:bg-(--surface-3) hover:text-inherit"
    >
      {masked ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      <span className="text-xs">{masked ? "Hidden" : "Visible"}</span>
    </button>
  );
}

function SidebarSignOut() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-(--surface-3) hover:text-inherit"
    >
      <LogOut className="h-5 w-5" aria-hidden />
      <span className="hidden md:inline">Sign out</span>
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivacyProvider>
      <SyncProvider>
      <div className="mx-auto max-w-[1920px]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-(--border) bg-(--surface-1) p-3 md:flex">
          <div className="mb-6 flex items-center px-2">
            <FundsLogo className="h-7 w-auto text-zinc-50" />
          </div>
          <AddButton label="Add" className="mb-3 w-full" />
          <UserCard />
          <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
          <div className="flex flex-col gap-1 border-t border-(--border) pt-3">
            <PrivacyToggle />
            <NavLink
              item={{ href: "/dashboard/settings", label: "Settings", icon: Settings }}
            />
            <SidebarSignOut />
          </div>
        </aside>

        {/* Mobile top header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-(--border) bg-(--bg)/95 px-4 py-2.5 backdrop-blur md:hidden">
          <span className="flex items-center">
            <FundsLogo className="h-6 w-auto text-zinc-50" />
          </span>
          <span className="flex items-center gap-2">
            <PrivacyToggle />
            <SyncPill />
            <AccountChip />
          </span>
        </header>

        {/* Main content */}
        <main className="pb-24 pt-4 md:ml-56 md:pb-8">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <SignedOutBanner />
          </div>
          {children}
        </main>

        {/* Mobile bottom bar */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-(--border) bg-(--surface-1) px-4 pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div className="grid grid-cols-5 items-center">
            <MobileTab item={NAV_ITEMS[0]!} />
            <MobileTab item={NAV_ITEMS[1]!} />
            <Link
              href="/dashboard?capture=1"
              aria-label="Add transaction"
              className="relative -mt-6 flex h-16 w-16 items-center justify-center self-center rounded-full bg-(--accent) text-(--accent-foreground) ring-4 ring-(--bg) transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:scale-95"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
            </Link>
            <MobileTab item={NAV_ITEMS[2]!} />
            <MobileTab item={NAV_ITEMS[3]!} />
          </div>
        </nav>
      </div>
      </SyncProvider>
    </PrivacyProvider>
  );
}

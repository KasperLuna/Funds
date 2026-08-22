"use client";

import { Shield, Settings, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NavLink, SyncPill, AddButton } from "@/components/app-shell/shell-nav";

function PrivacyButton() {
  const pathname = usePathname();
  const active = pathname === "/dashboard/privacy";
  return (
    <Link
      href="/dashboard/privacy"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center justify-center gap-1 rounded-(--radius-md) p-2 transition-colors",
        active ? "text-(--accent)" : "text-slate-400 hover:text-inherit",
      )}
    >
      <Shield className="h-5 w-5" aria-hidden />
      <span className="text-xs">Privacy</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1920px]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-(--border) bg-(--surface-1) p-3 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="h-8 w-8 rounded-lg bg-(--accent)" aria-hidden />
          <span className="text-lg font-semibold">Funds</span>
        </div>
        <AddButton label="Add" className="mb-3 w-full" />
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-(--border) pt-3">
          <NavLink
            item={{ href: "/dashboard/settings", label: "Settings", icon: Settings }}
          />
          <Link
            href="/"
            className="flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-(--surface-2) hover:text-inherit"
          >
            <LogOut className="h-5 w-5" aria-hidden />
            <span className="hidden md:inline">Sign out</span>
          </Link>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-(--border) bg-(--bg)/95 px-4 py-2 backdrop-blur md:hidden">
        <span className="text-lg font-semibold">Funds</span>
        <SyncPill />
      </header>

      {/* Main content */}
      <main className="pb-24 pt-4 md:ml-56 md:pb-8">{children}</main>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-(--border) bg-(--surface-1) px-4 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-5 items-center">
          <NavLink item={NAV_ITEMS[0]!} />
          <NavLink item={NAV_ITEMS[1]!} />
          <Link
            href="/dashboard?capture=1"
            aria-label="Add transaction"
            className="relative -mt-5 flex h-14 w-14 items-center justify-center self-center rounded-full bg-(--accent) text-(--accent-foreground) shadow-lg"
          >
            <Plus className="h-6 w-6" aria-hidden />
          </Link>
          <NavLink item={NAV_ITEMS[2]!} />
          <PrivacyButton />
        </div>
      </nav>
    </div>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Landmark, Bitcoin, Tag, Plus, Check, CloudOff, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSync } from "@/lib/sync/sync-context";
import { AddMenu, ADD_MENU_TARGETS } from "./add-menu";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/banks", label: "Banks", icon: Landmark },
  { href: "/dashboard/categories", label: "Categories", icon: Tag },
  { href: "/dashboard/crypto", label: "Crypto", icon: Bitcoin },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors duration-150 ease-out",
        active
          ? "bg-(--surface-3) font-semibold text-inherit"
          : "font-medium text-zinc-500 hover:bg-(--surface-3) hover:text-inherit",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-1/2 -left-1.5 h-4 w-0.5 -translate-y-1/2 rounded-sm bg-(--accent)"
        />
      )}
      <Icon className={cn("h-5 w-5", active && "text-(--accent)")} aria-hidden />
      <span className="hidden md:inline">{item.label}</span>
    </Link>
  );
}

export function MobileTab({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "relative flex h-14 flex-col items-center justify-center",
        active ? "text-inherit" : "text-zinc-500",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-3 top-0 h-0.5 rounded-b-sm bg-(--accent)"
        />
      )}
      <Icon className={cn("h-6 w-6", active && "text-(--accent)")} aria-hidden />
    </Link>
  );
}

export function SyncPill() {
  const { syncStatus } = useSync();
  const offline = !syncStatus.online;
  const syncing = syncStatus.online && syncStatus.lastSyncedAt == null;
  return (
    <span
      role="status"
      aria-label={offline ? "Sync status: offline" : syncing ? "Sync status: syncing" : "Sync status: synced"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-(--border) bg-(--surface-2) px-2.5 py-1 text-xs font-medium",
        offline ? "text-(--warning)" : syncing ? "text-(--warning)" : "text-(--accent)",
      )}
    >
      {offline || syncing ? (
        <CloudOff className="h-3 w-3" strokeWidth={3} aria-hidden />
      ) : (
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      )}
      <span className="hidden sm:inline">
        {offline ? "Offline" : syncing ? "Syncing" : "Synced"}
      </span>
    </span>
  );
}

export function AddButton({ label = "Add", className }: { label?: string; className?: string }) {
  return (
    <AddMenu
      defaultHref="/dashboard?capture=1"
      menuLabel="Log transaction"
      items={ADD_MENU_TARGETS}
      className={className}
      menuClassName="left-0 top-full mt-2"
    >
      {({ open, onMain, onToggle }) => (
        <div className="flex w-full items-stretch overflow-hidden rounded-(--radius-md) bg-(--accent) text-(--accent-foreground)">
          <button
            type="button"
            onClick={onMain}
            className="flex min-h-11 flex-1 items-center justify-center gap-1 px-3 transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:brightness-95"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            <span className="hidden text-sm font-semibold lg:inline">{label}</span>
          </button>
          <span aria-hidden className="w-px bg-(--accent-foreground)/25" />
          <button
            type="button"
            aria-label="More transaction types"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={onToggle}
            className="flex min-h-11 w-9 shrink-0 items-center justify-center transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:brightness-95"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-150 ease-out", open && "rotate-180")}
              aria-hidden
            />
          </button>
        </div>
      )}
    </AddMenu>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Landmark, Bitcoin, Tag, Plus, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
        "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors",
        active ? "bg-(--surface-2) text-(--accent)" : "text-slate-400 hover:bg-(--surface-2) hover:text-inherit",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span className="hidden md:inline">{item.label}</span>
    </Link>
  );
}

export function SyncPill() {
  // cavetail: real sync state lands with PowerSync (P4 spike); placeholder shows synced
  return (
    <span
      role="status"
      aria-label="Sync status: synced"
      className="inline-flex items-center gap-1 rounded-full bg-(--surface-2) px-2 py-1 text-xs text-(--accent)"
    >
      <Check className="h-3 w-3" aria-hidden />
      <span className="hidden sm:inline">Synced</span>
    </span>
  );
}

export function AddButton({ label = "Add", className }: { label?: string; className?: string }) {
  return (
    <Link
      href="/dashboard?capture=1"
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-(--radius-md) bg-(--accent) text-(--accent-foreground) transition-opacity hover:opacity-90",
        className,
      )}
    >
      <Plus className="h-5 w-5" aria-hidden />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}
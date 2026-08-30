"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type AddMenuTarget = { label: string; href: string };

/** DESIGN.md §3.1 — the mini-menu: Expense · Income · Transfer · Trade. */
export const ADD_MENU_TARGETS: AddMenuTarget[] = [
  { label: "Expense", href: "/dashboard?capture=1&type=expense" },
  { label: "Income", href: "/dashboard?capture=1&type=income" },
  { label: "Transfer", href: "/dashboard/assets?tab=banks&transfer=1" },
  { label: "Trade", href: "/dashboard/assets?tab=crypto&trade=1" },
];

type AddMenuRender = (controls: {
  open: boolean;
  /** Stop the menu popover — call on every primary-action click. */
  onMain: () => void;
  onToggle: () => void;
  /** Pre-fetched href to bind the primary action to a Next <Link> for instant nav. */
  defaultHref: string;
}) => React.ReactNode;

/**
 * A two-part capture trigger: a primary action (navigate to `defaultHref`) and
 * a toggle that opens a mini-menu of capture variants. The trigger composition
 * is owned by the caller via render props — the primary action is expected to
 * be a Next <Link> (with prefetch) so the destination chunk is warm before the
 * tap lands; menu popover behavior is shared.
 *
 * No long-press anywhere — the toggle is an explicit, discoverable control
 * (split-button caret on desktop, caret cap on the mobile FAB).
 */
export function AddMenu({
  defaultHref,
  menuLabel,
  items,
  className,
  menuClassName,
  children,
}: {
  defaultHref: string;
  menuLabel: string;
  items: AddMenuTarget[];
  className?: string;
  menuClassName?: string;
  children: AddMenuRender;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Cavetail: when the menu is open, the primary action becomes a close button
  // (the user already sees the menu — the + shouldn't also navigate).
  const handleMain = () => {
    if (open) setOpen(false);
  };

  const handleToggle = () => setOpen((o) => !o);

  // cavetail: pointerdown + Escape listeners are browser DOM APIs outside
  // React's tree; tear them down on close. Genuine side effect, not derived state.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {children({ open, onMain: handleMain, onToggle: handleToggle, defaultHref })}

      {open && (
        <div
          role="menu"
          aria-label={menuLabel}
          className={cn(
            "absolute z-50 min-w-44 overflow-hidden rounded-(--radius-md) border border-(--border-strong) bg-(--surface-3) p-1",
            menuClassName,
          )}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm text-zinc-300 transition-colors hover:bg-(--surface-2) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
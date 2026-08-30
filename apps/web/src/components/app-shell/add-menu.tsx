"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  onMain: () => void;
  onToggle: () => void;
}) => React.ReactNode;

/**
 * A two-part capture trigger: a primary action (tap → `defaultHref`) and a
 * toggle that opens a mini-menu of capture variants. The trigger composition
 * is owned by the caller via render props; menu popover behavior is shared.
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const handleMain = () => {
    if (open) {
      setOpen(false);
      return;
    }
    router.push(defaultHref);
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
      {children({ open, onMain: handleMain, onToggle: handleToggle })}

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
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type AddMenuTarget =
  | { label: string; href: string }
  | { label: string; onOpen: () => void };

/** DESIGN.md §3.1 — the mini-menu: Expense · Income · Transfer · Trade. */
export const ADD_MENU_TARGETS: AddMenuTarget[] = [
  { label: "Expense", onOpen: () => {} },
  { label: "Income", onOpen: () => {} },
  { label: "Transfer", href: "/dashboard/assets?tab=banks&transfer=1" },
  { label: "Trade", href: "/dashboard/assets?tab=crypto&trade=1" },
];

type AddMenuRender = (controls: {
  open: boolean;
  /** Synchronous primary action — call from a click handler with the event
   *  so handleMain can preventDefault before navigating. Bypasses next/link's
   *  startTransition deferral so the first tap always wins on cold PWA open. */
  onMain: (e: React.SyntheticEvent) => void;
  onToggle: () => void;
  /** Pre-fetched href to bind the primary action to a Next <Link> for instant nav. */
  defaultHref: string;
  /** Optional non-navigating primary action. When set, the Link's onClick
   *  calls this synchronously instead of the router — used for capture-sheet
   *  entry points that should open the sheet on the current page. */
  defaultOnOpen?: () => void;
}) => React.ReactNode;

/**
 * A two-part capture trigger: a primary action (navigate to `defaultHref`) and
 * a toggle that opens a mini-menu of capture variants. The trigger composition
 * is owned by the caller via render props; menu popover behavior is shared.
 *
 * No long-press anywhere — the toggle is an explicit, discoverable control
 * (split-button caret on desktop, caret cap on the mobile FAB).
 */
interface AddMenuProps {
  defaultHref: string;
  menuLabel: string;
  items: AddMenuTarget[];
  className?: string;
  menuClassName?: string;
  defaultOnOpen?: () => void;
  children: AddMenuRender;
}

export const AddMenu = ({
  defaultHref,
  menuLabel,
  items,
  className,
  menuClassName,
  defaultOnOpen,
  children,
}: AddMenuProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Cavetail: navigate synchronously, not via <Link onClick>. next/link wraps
  // its onClick in startTransition, which the React scheduler can defer past a
  // cold iOS PWA open while hydration is still settling — the click is consumed
  // by e.preventDefault() and the navigation never fires, so the user has to
  // tap again (and again). A direct router.push runs in the same task as the
  // click and is guaranteed to schedule the nav. The surrounding <Link> still
  // warms the destination chunk via prefetch on hover/touch.
  const handleMain = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (open) {
      setOpen(false);
      return;
    }
    router.push(defaultHref, { scroll: false });
  };

  const handleToggle = () => setOpen((o) => !o);

  // cavetail: menu items hit the same next/link startTransition deferral as the
  // primary FAB on cold PWA open. Force a synchronous router.push so the click
  // always schedules navigation; close the popover on the same tick.
  const handleItem = (href: string) => (e: React.SyntheticEvent) => {
    e.preventDefault();
    setOpen(false);
    router.push(href, { scroll: false });
  };

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
      {children({ open, onMain: handleMain, onToggle: handleToggle, defaultHref, defaultOnOpen })}

      {open && (
        <div
          role="menu"
          aria-label={menuLabel}
          className={cn(
            "absolute z-50 min-w-44 overflow-hidden rounded-(--radius-md) border border-(--border-strong) bg-(--surface-3) p-1",
            menuClassName,
          )}
        >
          {items.map((item) => {
            if ("href" in item) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={handleItem(item.href)}
                  className="flex min-h-11 items-center px-3 text-sm text-zinc-300 transition-colors hover:bg-(--surface-2) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  item.onOpen();
                }}
                className="flex min-h-11 w-full items-center px-3 text-sm text-zinc-300 transition-colors hover:bg-(--surface-2) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

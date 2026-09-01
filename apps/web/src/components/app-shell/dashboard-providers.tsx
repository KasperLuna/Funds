"use client";

import type { ReactNode } from "react";
import { Settings, Plus, ChevronUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NavLink, MobileTab, SyncPill, AddButton } from "@/components/app-shell/shell-nav";
import { NavProvider } from "@/components/app-shell/optimistic-nav";
import { AddMenu, ADD_MENU_TARGETS } from "@/components/app-shell/add-menu";
import { useCaptureSheet } from "@/components/capture/capture-sheet-context";
import { FundsLogo } from "@/components/brand/funds-logo";
import { UserCard } from "@/components/auth/user-card";
import { AccountChip, SignedOutBanner } from "@/components/auth/account-indicator";
import { SyncProvider } from "@/lib/sync/sync-context";
import { SyncQueryProvider } from "@/lib/sync/sync-query";
import { AssistantButton, AssistantOpener, AssistantSheetMount } from "@/components/assistant/assistant-button";
import { ChatProvider } from "@/components/assistant/use-chat";
import { CaptureSheetProvider } from "@/components/capture/capture-sheet-context";
import { CaptureSheetMount } from "@/components/capture/capture-sheet-mount";
import { CaptureOpener } from "@/components/capture/capture-opener";
import { PrivacyToggle } from "./privacy-toggle";
import { SidebarSignOut } from "./sidebar-sign-out";

interface DashboardProvidersProps {
  children: ReactNode;
}

export const DashboardProviders = ({ children }: DashboardProvidersProps) => {
  return (
    <NavProvider>
      <SyncProvider>
        <SyncQueryProvider>
          <ChatProvider>
            <AssistantOpener />
            <AssistantButton />
            <AssistantSheetMount />
            <CaptureSheetProvider>
              <CaptureOpener />
              <CaptureSheetMount />
              {children}
            </CaptureSheetProvider>
          </ChatProvider>
        </SyncQueryProvider>
      </SyncProvider>
    </NavProvider>
  );
};

interface DashboardShellProps {
  children: ReactNode;
}

const MobileAddFab = () => {
  const { setOpen, setPrefill } = useCaptureSheet();
  const openCapture = (type: "expense" | "income") => {
    setPrefill({ accountId: null, amountInput: null, categoryIds: [], description: "", type });
    setOpen(true);
  };
  const items = ADD_MENU_TARGETS.map((t) =>
    t.label === "Expense" ? { ...t, onOpen: () => openCapture("expense") } :
    t.label === "Income" ? { ...t, onOpen: () => openCapture("income") } :
    t,
  );
  return (
    <AddMenu
      defaultHref="/dashboard?capture=1"
      menuLabel="Log transaction"
      items={items}
      className="self-center"
      menuClassName="bottom-full left-1/2 -translate-x-1/2 mb-2"
      defaultOnOpen={() => {
        setPrefill(undefined);
        setOpen(true);
      }}
    >
      {({ open, onToggle, defaultOnOpen }) => (
        <div className="flex flex-col items-center -mt-6">
          <button
            type="button"
            aria-label="More transaction types"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={onToggle}
            className="flex h-5 w-9 items-center justify-center rounded-t-[6px] border border-(--border-strong) border-b-0 bg-(--surface-3) text-zinc-400 transition-colors hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
          >
            <ChevronUp
              className={cn("h-3.5 w-3.5 transition-transform duration-150 ease-out", open && "-translate-y-0.5")}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => defaultOnOpen?.()}
            aria-label="Add transaction"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-(--accent) text-(--accent-foreground) ring-4 ring-(--bg) transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      )}
    </AddMenu>
  );
};

export const DashboardShell = ({ children }: DashboardShellProps) => {
  return (
    <div className="mx-auto min-h-dvh max-w-[1920px] bg-(--bg)">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-(--border) bg-(--bg) p-3 md:flex">
        {/* 1 · Account */}
        <UserCard />

        {/* 2 · Visibility */}
        <PrivacyToggle className="mb-3" />

        {/* 3 · Add group */}
        <AddButton label="Add" className="mb-3" />

        {/* 4 · Navigation */}
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* 5 · Brand, bottom-anchored */}
        <Link
          href="/"
          aria-label="Funds home"
          className="mx-auto mb-4 mt-auto flex justify-center rounded-(--radius-md) p-2 text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <FundsLogo className="h-4 w-auto text-inherit" />
        </Link>

        {/* 6 · Settings */}
        <NavLink
          item={{ href: "/dashboard/settings", label: "Settings", icon: Settings }}
        />

        {/* 7 · Sign out */}
        <SidebarSignOut />
      </aside>

      {/* Mobile top header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-(--border) bg-(--bg)/95 px-4 py-2.5 backdrop-blur md:hidden">
        <span className="flex items-center">
          <FundsLogo className="h-6 w-auto text-zinc-50" />
        </span>
        <span className="flex items-center gap-2">
          <PrivacyToggle hideLabel className="gap-1 px-2" />
          <SyncPill />
          <AccountChip />
        </span>
      </header>

      {/* Main content */}
      <main className="min-h-dvh bg-(--bg) pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 md:ml-56 md:pb-8">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <SignedOutBanner />
        </div>
        {children}
      </main>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-(--border) bg-(--bg) px-4 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-5 items-center">
          <MobileTab item={NAV_ITEMS[0]!} />
          <MobileTab item={NAV_ITEMS[1]!} />
          <MobileAddFab />
          <MobileTab item={NAV_ITEMS[2]!} />
          <MobileTab item={NAV_ITEMS[3]!} />
        </div>
      </nav>
    </div>
  );
};

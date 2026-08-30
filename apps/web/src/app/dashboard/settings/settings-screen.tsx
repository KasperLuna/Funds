"use client";

import Link from "next/link";
import { Check, Circle, CreditCard, LinkIcon, Plus } from "lucide-react";
import { Section } from "@/components/settings/section";
import { SyncStatus } from "@/components/settings/sync-status";
import { NotificationPermission } from "@/components/settings/notification-permission";
import { PrivacyToggle } from "@/components/settings/privacy-toggle";
import { AccountSection } from "@/components/settings/account-section";
import { AssistantStatus } from "@/components/settings/assistant-status";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";

const CHECKLIST_ITEMS = [
  { id: "account", label: "Create first account", icon: CreditCard, href: "/dashboard/assets?tab=banks" },
  { id: "transaction", label: "Log first transaction", icon: Plus, href: "/dashboard?capture=1" },
  { id: "bank", label: "Connect bank", icon: LinkIcon, href: "/dashboard/assets?tab=banks" },
];

export const SettingsScreen = () => {
  const accountsQuery = useSyncQuery({
    key: queryKeys.accounts,
    sql: "SELECT * FROM accounts WHERE deleted_at IS NULL AND archived = 0",
    select: (r) => r,
  });
  const transactionsQuery = useSyncQuery({
    key: queryKeys.transactions,
    sql: "SELECT * FROM transactions WHERE deleted_at IS NULL",
    select: (r) => r,
  });

  const accounts = accountsQuery.data?.length ?? 0;
  const transactions = transactionsQuery.data?.length ?? 0;

  const isChecklistItemComplete = (id: string) => {
    if (id === "account") return accounts > 0;
    if (id === "transaction") return transactions > 0;
    return false;
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>

      <Section title="Onboarding">
        <ul className="flex flex-col gap-3" role="list">
          {CHECKLIST_ITEMS.map((item) => {
            const Icon = item.icon;
            const complete = isChecklistItemComplete(item.id);
            return (
              <li key={item.id} role="listitem">
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors hover:bg-(--surface-3)"
                >
                  {complete ? (
                    <Check className="h-4 w-4 shrink-0 text-(--accent)" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
                  )}
                  <Icon className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Sync">
        <SyncStatus />
      </Section>

      <Section title="Notifications">
        <NotificationPermission />
      </Section>

      <Section title="Account">
        <AccountSection />
      </Section>

      <Section title="Privacy">
        <PrivacyToggle />
      </Section>

      <AssistantStatus />
    </div>
  );
};

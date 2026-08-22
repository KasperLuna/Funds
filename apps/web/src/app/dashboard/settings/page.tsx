"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Circle,
  CreditCard,
  LinkIcon,
  Plus,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserCard } from "@/components/auth/user-card";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SyncStatus } from "@/components/settings/sync-status";
import { usePrivacy } from "@/lib/privacy/privacy-context";

const CHECKLIST_ITEMS = [
  { id: "account", label: "Create first account", icon: CreditCard },
  { id: "transaction", label: "Log first transaction", icon: Plus },
  { id: "bank", label: "Connect bank", icon: LinkIcon },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const request = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const label =
    permission === "granted"
      ? "Enabled"
      : permission === "denied"
        ? "Blocked"
        : "Not set";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <p className="text-sm font-medium">Reminders</p>
          <p className="text-xs text-slate-400">
            {label} — receive notifications for planned transactions
          </p>
        </div>
      </div>
      {permission !== "granted" && permission !== "denied" && (
        <Button variant="outline" size="sm" onClick={request}>
          Enable
        </Button>
      )}
    </div>
  );
}

function PrivacyToggle() {
  const { masked, toggle } = usePrivacy();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <p className="text-sm font-medium">Privacy mode</p>
          <p className="text-xs text-slate-400">
            {masked ? "Values are hidden" : "Values are visible"}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={toggle}>
        {masked ? "Reveal" : "Hide"}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Section title="Onboarding">
        <ul className="flex flex-col gap-3" role="list">
          {CHECKLIST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 text-sm"
                role="listitem"
              >
                <Circle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span>{item.label}</span>
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
        <UserCard />
        <SignOutButton />
      </Section>

      <Section title="Privacy">
        <PrivacyToggle />
      </Section>
    </div>
  );
}

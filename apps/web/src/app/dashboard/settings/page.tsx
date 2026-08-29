"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  Circle,
  CreditCard,
  LinkIcon,
  Plus,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ModelId } from "@/lib/llm/types";
import { MODEL_LABELS } from "@/lib/llm/types";
import { UserCard } from "@/components/auth/user-card";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SyncStatus } from "@/components/settings/sync-status";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import { useSync } from "@/lib/sync/sync-context";
import {
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/notifications";

const CHECKLIST_ITEMS = [
  { id: "account", label: "Create first account", icon: CreditCard, href: "/dashboard/assets?tab=banks" },
  { id: "transaction", label: "Log first transaction", icon: Plus, href: "/dashboard?capture=1" },
  { id: "bank", label: "Connect bank", icon: LinkIcon, href: "/dashboard/assets?tab=banks" },
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
      <h2 className="label-micro mb-4">{title}</h2>
      {children}
    </section>
  );
}

function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const { db, userId } = useSync();

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const request = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted" && userId) {
      setBusy(true);
      try {
        const res = await fetch("/api/push/config");
        const { vapidPublicKey } = (await res.json()) as { vapidPublicKey: string };
        if (vapidPublicKey) {
          await subscribeToPush(db, userId, vapidPublicKey);
        }
      } catch (err) {
        console.error("Failed to enable reminders:", err);
      } finally {
        setBusy(false);
      }
    }
  }, [db, userId]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush(db);
      setPermission("default");
    } catch (err) {
      console.error("Failed to disable reminders:", err);
    } finally {
      setBusy(false);
    }
  }, [db]);

  const label =
    permission === "granted"
      ? "Enabled"
      : permission === "denied"
        ? "Blocked"
        : "Not set";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-zinc-500" />
        <div>
          <p className="text-sm font-medium">Reminders</p>
          <p className="text-xs text-zinc-500">
            {label} — receive notifications for planned transactions
          </p>
        </div>
      </div>
      {permission === "granted" ? (
        <Button variant="outline" size="sm" onClick={() => void disable()} disabled={busy}>
          Disable
        </Button>
      ) : permission !== "denied" ? (
        <Button variant="outline" size="sm" onClick={() => void request()} disabled={busy}>
          Enable
        </Button>
      ) : null}
    </div>
  );
}

function PrivacyToggle() {
  const { masked, toggle } = usePrivacy();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 shrink-0 text-zinc-500" />
        <div>
          <p className="text-sm font-medium">Privacy mode</p>
          <p className="text-xs text-zinc-500">
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
      <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>

      <Section title="Onboarding">
        <ul className="flex flex-col gap-3" role="list">
          {CHECKLIST_ITEMS.map((item) => {
            const Icon = item.icon;
            const complete =
              item.id === "account"
                ? accounts > 0
                : item.id === "transaction"
                  ? transactions > 0
                  : false;
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
        <UserCard />
        <SignOutButton />
      </Section>

      <Section title="Privacy">
        <PrivacyToggle />
      </Section>

      <AssistantStatus />
    </div>
  );
}

function AssistantStatus() {
  const [support, setSupport] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<string>("not-loaded");
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [cachedModels, setCachedModels] = useState<Record<string, boolean>>({});
  const [modelIds, setModelIds] = useState<ModelId[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadingModel, setDownloadingModel] = useState<ModelId | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { detectSupport } = await import("@/lib/llm/capability");
      const s = await detectSupport();
      setSupport(s.ok ? `${s.engine} · ${s.recommendedModel}` : s.reason);

      const { getLlmEngine, allModelIds, isModelAvailable } = await import("@/lib/llm");
      const engine = getLlmEngine();
      setEngineStatus(engine.status());
      const model = engine.currentModelId();
      setCurrentModel(model);

      const ids = allModelIds();
      setModelIds(ids);

      const cached: Record<string, boolean> = {};
      for (const id of ids) {
        cached[id] = await isModelAvailable(id);
      }
      setCachedModels(cached);
    })();
  }, []);

  const handleDownload = useCallback(async (modelId: ModelId) => {
    setDownloadingModel(modelId);
    setDownloadProgress(0);
    setDownloadError(null);
    try {
      const { getLlmEngine } = await import("@/lib/llm");
      const engine = getLlmEngine();
      await engine.load(modelId, (p) => {
        setDownloadProgress(Math.round(p.loaded * 100));
      });
      setEngineStatus("ready");
      setCurrentModel(modelId);
      setCachedModels((prev) => ({ ...prev, [modelId]: true }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setDownloadError(msg);
      console.error("Model download failed:", err);
    } finally {
      setDownloadingModel(null);
      setDownloadProgress(null);
    }
  }, []);

  const handleUnload = useCallback(async () => {
    const { getLlmEngine } = await import("@/lib/llm");
    await getLlmEngine().unload();
    setEngineStatus("not-loaded");
    setCurrentModel(null);
  }, []);

  return (
    <Section title="On-device assistant">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">Capability</span>
        <span className="text-zinc-300">{support ?? "checking…"}</span>
      </div>

      {downloadError && (
        <div className="mt-2 rounded-(--radius-md) border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <p className="font-medium">Download failed</p>
          <p className="mt-0.5 text-red-400/80">{downloadError}</p>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {modelIds.map((id) => {
          const label = MODEL_LABELS[id];
          const isCached = cachedModels[id] ?? false;
          const isActive = currentModel === id && engineStatus === "ready";
          return (
            <div
              key={id}
              className="flex items-center justify-between rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{label}</span>
                {isActive && (
                  <span className="rounded-full bg-(--accent)/10 px-1.5 py-0.5 text-[10px] font-medium text-(--accent)">
                    Active
                  </span>
                )}
                {isCached && !isActive && (
                  <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    Cached
                  </span>
                )}
              </div>
              {isActive ? (
                <Button variant="ghost" size="sm" onClick={() => void handleUnload()}>
                  Unload
                </Button>
              ) : downloadingModel === id ? (
                downloadProgress !== null ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-(--accent) transition-[width]"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400">{downloadProgress}%</span>
                  </div>
                ) : null
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownload(id)}
                >
                  {isCached ? "Load" : "Download"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

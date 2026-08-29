"use client";

import { formatMoney } from "@/lib/money";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import type { BudgetProgressPayload } from "@/lib/assistant/types";
import { GenUiFooter } from "../GenUiFooter";

function usageColor(pct: number): string {
  if (pct > 90) return "bg-(--danger)";
  if (pct >= 70) return "bg-(--warning)";
  return "bg-(--accent)";
}

function usageLabel(pct: number): string {
  if (pct > 90) return "text-(--danger)";
  if (pct >= 70) return "text-(--warning)";
  return "text-(--accent)";
}

function statusCopy(status: "under" | "near" | "over"): string {
  if (status === "over") return "Over budget";
  if (status === "near") return "Near limit";
  return "On track";
}

export function BudgetProgressCard({
  payload,
  onViewData,
}: {
  payload: BudgetProgressPayload;
  onViewData?: () => void;
}) {
  const { masked } = usePrivacy();
  const spent = BigInt(payload.spentMinor);
  const limit = BigInt(payload.limitMinor);
  const pct = Math.min(100, Math.max(0, Math.round(payload.pctUsed)));

  return (
    <section
      aria-label="Budget progress"
      className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-4"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">{payload.category}</h3>
        <span className={`text-xs font-medium ${usageLabel(payload.pctUsed)}`}>
          {statusCopy(payload.status)}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{payload.periodLabel}</p>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="font-display text-2xl font-bold tracking-tight">
          {masked ? "••••" : formatMoney(spent, payload.decimals, payload.assetCode)}
        </span>
        <span className="text-xs text-zinc-500">
          of{" "}
          {masked ? "••••" : formatMoney(limit, payload.decimals, payload.assetCode)}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${payload.category} budget used`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--surface-3)"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${usageColor(payload.pctUsed)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-zinc-500">{pct}% used</p>

      <GenUiFooter updatedAt={Date.now()} onViewData={onViewData} />
    </section>
  );
}

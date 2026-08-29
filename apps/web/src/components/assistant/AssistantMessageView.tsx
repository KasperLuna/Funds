"use client";

import { useState, type ReactNode } from "react";
import { BudgetProgressCard } from "./messages/BudgetProgressCard";
import { CategoryBarChartCard } from "./messages/CategoryBarChartCard";
import { SummaryDashboardCard } from "./messages/SummaryDashboardCard";
import { VoiceTxnPrefillCard } from "./messages/VoiceTxnPrefillCard";
import { PeriodCompareCard } from "./messages/PeriodCompareCard";
import { MerchantListCard } from "./messages/MerchantListCard";
import { RecurringListCard } from "./messages/RecurringListCard";
import { BurnRateCard } from "./messages/BurnRateCard";
import { AnomalyListCard } from "./messages/AnomalyListCard";
import type { AssistantMessage } from "@/lib/assistant/types";
import { DataInspector } from "./DataInspector";

/**
 * Switch on the validated message type. The model can NEVER route here
 * directly — it can only set one of the `type` values that has a Zod schema
 * and a fixed component. There is no dynamic JSX path.
 *
 * A second model call writes a one-sentence TL;DR to `tldr`; the renderer
 * shows it as a headline line at the top of every widget.
 */
export function AssistantMessageView({ message }: { message: AssistantMessage }) {
  const [showInspector, setShowInspector] = useState(false);

  let widget: ReactNode = null;
  if (message.type === "error") {
    widget = (
      <div className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-3 text-sm text-zinc-400">
        {message.reason}
        {"rawOutput" in message && message.rawOutput && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">
              Raw model output
            </summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-(--radius-md) bg-(--surface-2) p-2 font-mono text-[10px] leading-relaxed text-zinc-500">
              {message.rawOutput}
            </pre>
          </details>
        )}
      </div>
    );
  } else if (message.type === "text") {
    widget = (
      <div className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-3 text-sm text-zinc-300">
        {message.content}
      </div>
    );
  } else if (message.type === "budget_progress") {
    widget = <BudgetProgressCard payload={message} onViewData={() => setShowInspector(true)} />;
  } else if (message.type === "spending_breakdown") {
    widget = <CategoryBarChartCard payload={message} onViewData={() => setShowInspector(true)} />;
  } else if (message.type === "summary_dashboard") {
    widget = <SummaryDashboardCard payload={message} onViewData={() => setShowInspector(true)} />;
  } else if (message.type === "voice_to_txn") {
    widget = <VoiceTxnPrefillCard payload={message} onViewData={() => setShowInspector(true)} />;
  } else if (message.type === "period_compare") {
    widget = <PeriodCompareCard payload={message} onViewData={() => setShowInspector(true)} />;
  } else if (message.type === "merchant_breakdown") {
    widget = <MerchantListCard payload={message} onViewData={() => setShowInspector(true)} />;
  } else if (message.type === "recurring_list") {
    widget = <RecurringListCard payload={message} onViewData={() => setShowInspector(true)} />;
  } else if (message.type === "burn_rate") {
    widget = <BurnRateCard payload={message} onViewData={() => setShowInspector(true)} />;
  } else if (message.type === "anomaly_list") {
    widget = <AnomalyListCard payload={message} onViewData={() => setShowInspector(true)} />;
  }

  return (
    <>
      {"notice" in message && message.notice && (
        <div className="mb-2 rounded-(--radius-lg) border border-(--border) bg-(--surface-1) px-3 py-2 text-xs text-zinc-400">
          {message.notice}
        </div>
      )}
      {message.tldr && message.type !== "text" && message.type !== "error" && (
        <p className="mb-2 border-l-2 border-(--accent) pl-2 text-sm font-medium text-zinc-200">
          {message.tldr}
        </p>
      )}
      {widget}
      {"rawOutput" in message && message.rawOutput && message.type !== "error" && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">
            Raw model output
          </summary>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-(--radius-md) bg-(--surface-2) p-2 font-mono text-[10px] leading-relaxed text-zinc-500">
            {message.rawOutput}
          </pre>
        </details>
      )}
      {showInspector && <DataInspector message={message} onClose={() => setShowInspector(false)} />}
    </>
  );
}

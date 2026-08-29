"use client";

import { useState, type ReactNode } from "react";
import { BudgetProgressCard } from "./messages/BudgetProgressCard";
import { CategoryBarChartCard } from "./messages/CategoryBarChartCard";
import { SummaryDashboardCard } from "./messages/SummaryDashboardCard";
import { VoiceTxnPrefillCard } from "./messages/VoiceTxnPrefillCard";
import type { AssistantMessage } from "@/lib/assistant/types";
import { DataInspector } from "./DataInspector";

/**
 * Switch on the validated message type. The model can NEVER route here
 * directly — it can only set one of the `type` values that has a Zod schema
 * and a fixed component. There is no dynamic JSX path.
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
  }

  return (
    <>
      {widget}
      {showInspector && <DataInspector message={message} onClose={() => setShowInspector(false)} />}
    </>
  );
}

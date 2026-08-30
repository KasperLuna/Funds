"use client";

import { useState, type ReactNode } from "react";
import { BudgetProgressCard } from "./messages/budget-progress-card";
import { CategoryBarChartCard } from "./messages/category-bar-chart-card";
import { BurnRateCard } from "./messages/burn-rate-card";
import { VoiceTxnPrefillCard } from "./messages/voice-txn-prefill-card";
import { PeriodCompareCard } from "./messages/period-compare-card";
import { MerchantListCard } from "./messages/merchant-list-card";
import { SearchResultsCard } from "./messages/search-results-card";
import { UnsupportedAffordance } from "./messages/unsupported-affordance";
import type { AssistantMessage } from "@/lib/assistant/types";
import { DataInspector } from "./data-inspector";

interface AssistantMessageViewProps {
  message: AssistantMessage;
  onPickSuggestion?: (text: string) => void;
}

/**
 * Switch on the validated message type. The model can NEVER route here
 * directly — it can only set one of the `type` values that has a Zod schema
 * and a fixed component. There is no dynamic JSX path.
 *
 * A deterministic headline line (`tldr`) is rendered above the widget
 * for every payload type except text / error / voice_to_txn.
 */
export const AssistantMessageView = ({ message, onPickSuggestion }: AssistantMessageViewProps) => {
  const [showInspector, setShowInspector] = useState(false);
  const widget = renderWidget(message, onPickSuggestion, () => setShowInspector(true));

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
};

function renderWidget(
  message: AssistantMessage,
  onPickSuggestion: ((text: string) => void) | undefined,
  onShowInspector: () => void,
): ReactNode {
  if (message.type === "error") {
    return (
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
  }
  if (message.type === "text") {
    return (
      <div className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-3 text-sm text-zinc-300">
        <p>{message.content}</p>
        {message.suggestedUseCases && message.suggestedUseCases.length > 0 && onPickSuggestion && (
          <UnsupportedAffordance
            suggestedUseCases={message.suggestedUseCases}
            onPick={onPickSuggestion}
          />
        )}
      </div>
    );
  }
  if (message.type === "budget_progress") return <BudgetProgressCard payload={message} onViewData={onShowInspector} />;
  if (message.type === "spending_breakdown") return <CategoryBarChartCard payload={message} onViewData={onShowInspector} />;
  if (message.type === "voice_to_txn") return <VoiceTxnPrefillCard payload={message} onViewData={onShowInspector} />;
  if (message.type === "period_compare") return <PeriodCompareCard payload={message} onViewData={onShowInspector} />;
  if (message.type === "merchant_breakdown") return <MerchantListCard payload={message} onViewData={onShowInspector} />;
  if (message.type === "burn_rate") return <BurnRateCard payload={message} onViewData={onShowInspector} />;
  if (message.type === "search_results") return <SearchResultsCard payload={message} onViewData={onShowInspector} />;
  return null;
}

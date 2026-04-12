import React from "react";
import { ExpandedTransaction } from "@/lib/types";
import { MixedDialogTrigger } from "../MixedDialog";
import { cn, parseAmount } from "@/lib/utils";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { PrivacyPeek } from "@/components/PrivacyPeek";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

export const TransactionsTableRow: React.FC<{
  transaction: ExpandedTransaction;
  odd?: boolean;
}> = ({ transaction, odd }) => {
  const { isPrivate } = usePrivacy();
  const { baseCurrency } = useUserQuery();
  const { date, amount, description, expand } = transaction;
  const { bank, categories } = expand || {};
  const isHideable = categories?.some((categ) => categ.hideable);

  return (
    <MixedDialogTrigger transaction={transaction}>
      <tr
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            (e.currentTarget as HTMLElement).click();
          }
        }}
        className={cn(
          "hover:bg-slate-800 cursor-pointer border-b border-slate-800 transition-colors touch-action-manipulation",
          odd ? "bg-slate-950/80" : "bg-slate-900/60",
        )}
      >
        <td className="px-4 py-2 whitespace-nowrap">
          {dateFormatter.format(new Date(date))}
        </td>
        <td className="px-4 py-2 whitespace-nowrap">{bank?.name}</td>
        <td
          className={cn(
            "px-4 py-2 font-mono tabular-nums",
            amount < 0 ? "text-red-400" : "text-green-400",
          )}
        >
          <PrivacyPeek
            isPrivate={!!(isHideable && isPrivate)}
            revealedContent={parseAmount(amount, baseCurrency?.code)}
            maskedContent={`${baseCurrency?.symbol ?? "$"}••••••`}
          />
        </td>
        <td className="px-4 py-2 max-w-[200px] truncate">{description}</td>
        <td className="px-4 py-2">
          <div className="flex flex-row flex-wrap gap-1">
            {categories?.map((category) => (
              <span
                key={category.id}
                className="bg-slate-600 rounded-full px-2 text-xs"
                title={category?.name}
              >
                {category?.name}
              </span>
            ))}
          </div>
        </td>
      </tr>
    </MixedDialogTrigger>
  );
};

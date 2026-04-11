import React from "react";
import { ExpandedTransaction } from "@/lib/types";
import { MixedDialogTrigger } from "../MixedDialog";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/hooks/usePrivacy";
import { parseAmount } from "@/lib/utils";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { PrivacyPeek } from "@/components/PrivacyPeek";

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
        className={cn(
          "hover:bg-slate-800 cursor-pointer border-b border-slate-800 transition-colors",
          odd ? "bg-slate-950/80" : "bg-slate-900/60",
        )}
      >
        <td className="px-4 py-2 whitespace-nowrap">
          {dayjs(date).format("MMM D")}
        </td>
        <td className="px-4 py-2 whitespace-nowrap">{bank?.name}</td>
        <td
          className={cn(
            "px-4 py-2 font-mono",
            amount < 0 ? "text-red-400" : "text-green-400",
          )}
        >
          <PrivacyPeek
            isPrivate={!!(isHideable && isPrivate)}
            revealedContent={parseAmount(amount, baseCurrency?.code)}
            maskedContent={`${baseCurrency?.symbol ?? "$"}••••••`}
          />
        </td>
        <td className="px-4 py-2 max-w-[200px] truncate">
          {description.length > 50
            ? description.slice(0, 50) + "..."
            : description}
        </td>
        <td className="px-4 py-2">
          <div className="flex flex-row flex-wrap gap-1">
            {categories?.map((category) => (
              <span
                key={category.id}
                className="bg-slate-600 rounded-full px-2 text-xs"
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

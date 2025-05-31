import React from "react";
import { ExpandedTransaction } from "@/lib/types";
import { MixedDialogTrigger } from "../MixedDialog";
import dayjs from "dayjs";
import clsx from "clsx";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { parseAmount } from "@/lib/utils";

export const TransactionsTableRow: React.FC<{
  transaction: ExpandedTransaction;
  odd?: boolean;
}> = ({ transaction, odd }) => {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { baseCurrency } = useBanksCategsContext();
  const { date, amount, description, expand } = transaction;
  const { bank, categories } = expand || {};
  const isHideable = categories?.some((categ) => categ.hideable);

  return (
    <MixedDialogTrigger transaction={transaction}>
      <tr
        className={clsx(
          "hover:bg-slate-800 cursor-pointer border-b border-slate-800 transition-colors",
          odd ? "bg-slate-950/80" : "bg-slate-900/60"
        )}
      >
        <td className="px-4 py-2 whitespace-nowrap">
          {dayjs(date).format("MMM D")}
        </td>
        <td className="px-4 py-2 whitespace-nowrap">{bank?.name}</td>
        <td
          className={clsx(
            "px-4 py-2 font-mono",
            amount < 0 ? "text-red-400" : "text-green-400"
          )}
        >
          {isHideable && isPrivacyModeEnabled
            ? `${baseCurrency?.symbol ?? "$"}••••••`
            : parseAmount(amount, baseCurrency?.code)}
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

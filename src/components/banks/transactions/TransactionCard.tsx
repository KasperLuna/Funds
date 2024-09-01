import { Separator } from "../../ui/separator";
import { Bank, Category, ExpandedTransaction, Transaction } from "@/lib/types";
import dayjs from "dayjs";
import clsx from "clsx";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { useState } from "react";
import { TransactionDialog } from "@/components/banks/transactions/TransactionDialog";
import { parseAmount } from "@/lib/utils";

export const TransactionCard = (props: ExpandedTransaction) => {
  const { date, amount, description, expand } = props;

  const { bank, categories } = expand || {};

  const isHideable = categories?.some((categ) => categ.hideable);

  const { isPrivacyModeEnabled } = usePrivacyMode();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <TransactionDialog
      isModalOpen={isModalOpen}
      setIsModalOpen={setIsModalOpen}
      transaction={props}
      trigger={
        <div
          role="button"
          id="transaction-card"
          className="flex flex-col justify-between transition-all flex-grow h-full text-slate-200 p-2 border-2 gap-2 border-slate-700 hover:border-slate-600 rounded-xl hover:bg-slate-800 hover:cursor-pointer overflow-clip"
        >
          <div className="flex flex-row w-full items-center justify-between gap-2">
            <div className="flex flex-col text-start">
              <p className="text-nowrap">{dayjs(date).format("MMM D")}</p>
              <Separator orientation="horizontal" />
              <small>{bank?.name}</small>
            </div>
            <div className="flex flex-col text-right">
              <p
                className={clsx("text-lg font-semibold", {
                  "text-red-400": amount < 0,
                  "text-green-400": amount > 0,
                })}
              >
                {isHideable && isPrivacyModeEnabled
                  ? "₱••••••"
                  : parseAmount(amount)}
              </p>
              <small className="text-balance">
                {description.length > 50
                  ? description.slice(0, 50) + "..."
                  : description}
              </small>
            </div>
          </div>
          <div className="flex flex-row flex-wrap w-full bg-slate-900 rounded-md p-1 gap-2 border-2 border-slate-700 min-h-8">
            {categories?.map((category) => (
              <small
                key={category.id}
                className={clsx("bg-slate-600 rounded-full whitespace-nowrap", {
                  "px-2": !!category,
                })}
              >
                {category?.name}
              </small>
            ))}
          </div>
        </div>
      }
    />
  );
};

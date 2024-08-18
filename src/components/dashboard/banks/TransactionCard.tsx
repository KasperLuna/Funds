import { Edit } from "lucide-react";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { AppTxTypes, FirebaseTxTypes } from "@/lib/types";
import dayjs from "dayjs";
import clsx from "clsx";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { TransactionDialog } from "@/components/banks/TransactionDialog";
import { useState } from "react";

export const TransactionCard = (
  props: AppTxTypes & {
    isHideable?: boolean;
  }
) => {
  const { date, bank, amount, description, category, isHideable } = props;

  const { isPrivacyModeEnabled } = usePrivacyMode();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <TransactionDialog
      isModalOpen={isModalOpen}
      setIsModalOpen={setIsModalOpen}
      transaction={props}
      trigger={
        <div
          tabIndex={0}
          role="button"
          id="transaction-card"
          className="flex flex-col justify-between transition-all flex-grow h-full text-slate-200 p-2 border-2 gap-2 border-slate-700 hover:border-slate-600 rounded-lg hover:bg-slate-800 hover:cursor-pointer overflow-clip"
          // onClick={() => setIsModalOpen(true)}
        >
          <div className="flex flex-row w-full items-center justify-between gap-2">
            <div className="flex flex-col text-start">
              <p className="text-nowrap">{dayjs(date).format("MMM D")}</p>
              <Separator orientation="horizontal" />
              <small>{bank}</small>
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
                  : amount.toLocaleString(undefined, {
                      style: "currency",
                      currency: "PHP",
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 0,
                    })}
              </p>
              <small className="text-balance">
                {description.length > 50
                  ? description.slice(0, 50) + "..."
                  : description}
              </small>
            </div>
          </div>
          <div className="flex flex-row flex-wrap w-full bg-slate-900 rounded-md p-1 gap-2 border-2 border-slate-700 min-h-8">
            {category?.map((categoryItem) => (
              <small
                key={categoryItem}
                className={clsx("bg-slate-600 rounded-full whitespace-nowrap", {
                  "px-2": !!categoryItem,
                })}
              >
                {categoryItem}
              </small>
            ))}
          </div>
        </div>
      }
    />
  );
};

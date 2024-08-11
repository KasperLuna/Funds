import { Edit } from "lucide-react";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { FirebaseTxTypes } from "@/lib/types";
import dayjs from "dayjs";
import clsx from "clsx";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";

export const TransactionCard = ({
  date,
  bank,
  amount,
  description,
  category,
  isHideable,
}: FirebaseTxTypes & {
  isHideable?: boolean;
}) => {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  return (
    <div
      id="transaction-card"
      className="flex flex-col justify-between flex-grow text-slate-200 p-2 border-2 gap-2 border-slate-700 rounded-lg"
    >
      <div className="flex flex-row w-full items-center justify-between gap-2">
        <div className="flex flex-col text-center">
          <p className="text-nowrap">
            {dayjs(date?.seconds * 1000).format("MMM D")}
          </p>
          <Separator orientation="horizontal" />
          <small>{bank}</small>
        </div>
        <div className="flex flex-col text-center">
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
        <Button className="p-[10px] rounded-lg bg-slate-900 hover:bg-slate-600 border-slate-400 border-2 border-opacity-10">
          <Edit className="w-4 h-4" />
        </Button>
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
  );
};

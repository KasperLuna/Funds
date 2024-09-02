import { Button } from "@/components/ui/button";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { Bank } from "@/lib/types";
import { parseAmount } from "@/lib/utils";
import clsx from "clsx";
import Link from "next/link";

export const StatCard = ({
  name,
  balance,
  percentage,
}: Bank & {
  percentage?: string;
}) => {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { queryParams, setQueryParams } = useQueryParams();

  const isSelected = queryParams["bank"] === name;

  return (
    <div
      tabIndex={0}
      role="button"
      onClick={() => setQueryParams({ bank: !isSelected ? name : undefined })}
      className={clsx(
        "flex  md:mx-0 border-2 flex-col text-center text-slate-200 bg-slate-900 flex-grow p-2 rounded-md min-w-[155px] hover:bg-slate-700 transition-all",
        isSelected ? "border-slate-100" : " border-slate-600/25"
      )}
    >
      <div className="flex flex-row justify-between">
        {" "}
        <small>{name}</small>
        <small>{percentage}</small>
      </div>
      <p>{isPrivacyModeEnabled ? "₱••••••" : parseAmount(balance)}</p>
    </div>
  );
};

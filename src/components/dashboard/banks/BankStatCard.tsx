import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { Bank } from "@/lib/types";
import Link from "next/link";

export const StatCard = ({
  name,
  balance,
  percentage,
}: Bank & {
  percentage?: string;
}) => {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  return (
    <Link
      href={`/dashboard/banks/${name}`}
      className="flex border-slate-600/25  md:mx-0 border-2 flex-col text-center text-slate-200 bg-slate-900 flex-grow p-2 rounded-md min-w-[155px] hover:bg-slate-700 transition-all"
    >
      <div className="flex flex-row justify-between">
        {" "}
        <small>{name}</small>
        <small>{percentage}</small>
      </div>
      <p>
        {isPrivacyModeEnabled
          ? "₱••••••"
          : balance.toLocaleString(undefined, {
              style: "currency",
              currency: "PHP",
              maximumFractionDigits: 2,
              minimumFractionDigits: 0,
            })}
      </p>
    </Link>
  );
};

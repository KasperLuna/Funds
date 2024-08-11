"use client";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { Button } from "../ui/button";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";

export const BanksHeader = () => {
  const { isPrivacyModeEnabled, togglePrivacyMode } = usePrivacyMode();
  const { bankData } = useBanksCategsContext();
  const { banks } = bankData || {};
  const totalAmount =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  return (
    <div className="flex flex-row w-full justify-between items-center pb-3">
      <div className="flex flex-row gap-2 items-center text-slate-100">
        <Button
          onClick={() => {
            togglePrivacyMode();
          }}
          className={clsx("px-2 border-2 hover:border-slate-600 rounded-lg", {
            "border-blue-600": isPrivacyModeEnabled,
            "border-red-500": !isPrivacyModeEnabled,
          })}
        >
          {isPrivacyModeEnabled ? <EyeOff /> : <Eye />}
        </Button>
        <h1 className="md:text-4xl text-2xl font-semibold">Balances</h1>
      </div>
      <small className="text-slate-200 bg-slate-700 h-fit px-2 border-2 border-slate-600 rounded-full">
        Total:{" "}
        {isPrivacyModeEnabled
          ? "₱••••••"
          : totalAmount.toLocaleString(undefined, {
              style: "currency",
              currency: "PHP",
              maximumFractionDigits: 2,
              minimumFractionDigits: 0,
            })}
      </small>
    </div>
  );
};

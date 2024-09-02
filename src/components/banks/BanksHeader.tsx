"use client";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import { PrivacyToggle } from "../PrivacyToggle";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { decode } from "punycode";
import { parseAmount } from "@/lib/utils";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { Button } from "../ui/button";
import { Cross, X } from "lucide-react";

export const BanksHeader = () => {
  const { queryParams, setQueryParams } = useQueryParams();
  const bankName = queryParams["bank"];
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { bankData } = useBanksCategsContext();
  const displayValue = bankName
    ? bankData?.banks?.find((bank) => bank.name === bankName)?.balance
    : bankData?.banks?.reduce((acc, bank) => {
        return acc + bank.balance;
      }, 0) || 0;

  return (
    <div className="flex flex-row w-full justify-between items-center pb-3">
      <div className="flex flex-row gap-2 items-center text-slate-100">
        <PrivacyToggle />
        <h1 className="md:text-3xl text-2xl font-semibold">
          {bankName ? decodeURI(bankName) : "Balances"}
        </h1>
        {bankName && (
          <Button
            onClick={() => setQueryParams({ bank: undefined })}
            className="rounded-full p-1  w-5 h-5"
            variant={"secondary"}
          >
            <X className="w-5 h-5 stroke-2" />
          </Button>
        )}
      </div>
      <small className="text-slate-200 bg-slate-700 h-fit px-2 border-2 border-slate-600 rounded-full">
        Total: {isPrivacyModeEnabled ? "₱••••••" : parseAmount(displayValue)}
      </small>
    </div>
  );
};

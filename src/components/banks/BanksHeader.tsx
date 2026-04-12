"use client";
import { usePrivacy } from "@/hooks/usePrivacy";
import { parseAmount } from "@/lib/utils";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { PrivacyPeek } from "@/components/PrivacyPeek";

export const BanksHeader = () => {
  const { queryParams, setQueryParams } = useQueryParams();
  const bankName = queryParams["bank"];
  const { isPrivate } = usePrivacy();
  const bankData = useBanksQuery();
  const { baseCurrency } = useUserQuery();
  const displayValue = bankName
    ? bankData?.banks?.find((bank) => bank.name === bankName)?.balance
    : bankData?.banks?.reduce((acc, bank) => {
        return acc + bank.balance;
      }, 0) || 0;

  return (
    <div className="flex flex-row w-full justify-between items-center pb-1">
      <div className="flex flex-row gap-2 items-center text-slate-100">
        <h1 className="md:text-3xl text-2xl font-semibold">
          {bankName ? decodeURI(bankName) : "Balances"}
        </h1>
        {bankName && (
          <Button
            onClick={() => setQueryParams({ bank: undefined })}
            aria-label="Clear bank filter"
            className="rounded-full p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            variant={"secondary"}
          >
            <X className="w-5 h-5 stroke-2" />
          </Button>
        )}
      </div>
      <span className="text-slate-200 bg-slate-700 h-fit px-2 border-2 border-slate-600 rounded-full text-sm tabular-nums">
        Total:{" "}
        <PrivacyPeek
          isPrivate={isPrivate}
          revealedContent={parseAmount(displayValue, baseCurrency?.code)}
          maskedContent={`${baseCurrency?.symbol ?? "$"}••••••`}
        />
      </span>
    </div>
  );
};

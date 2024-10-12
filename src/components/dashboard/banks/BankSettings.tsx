import { BankSelect } from "@/components/banks/BankSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { recomputeBalanceById } from "@/lib/pocketbase/queries";
import { parseAmount } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

export const BankSettings = () => {
  const router = useRouter();
  const { bankData, baseCurrency } = useBanksCategsContext();
  const { control, watch } = useForm();
  const bank = watch("bank");
  return (
    <div className="flex flex-col gap-4 pb-3">
      <div className="flex flex-col gap-1 w-full">
        <Label htmlFor="date">{"Bank: "}</Label>
        <div className="flex flex-row gap-1">
          <Controller
            name="bank"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <BankSelect value={field.value} onChange={field.onChange} />
            )}
          />
          <Button
            className="px-2"
            onClick={() => router.push("/dashboard/banks?create=Bank")}
          >
            <Plus />
          </Button>
        </div>
      </div>
      <p>
        Balance:{" "}
        {parseAmount(
          bankData?.banks?.find((b) => b.id === bank)?.balance,
          baseCurrency?.code
        )}
      </p>
      <Separator />
      <div className="flex flex-col gap-2">
        <Button
          disabled={!bank}
          variant={"outline"}
          className="bg-slate-900 border-slate-500"
          onClick={() => {
            recomputeBalanceById(bank);
            alert("Balance recomputed");
          }}
        >
          Recompute Balance
        </Button>
        <Button
          disabled={!bank}
          variant={"outline"}
          className="bg-slate-900 border-slate-500"
          onClick={() => {
            alert("Not yet implemented, hehez");
          }}
        >
          Rename Bank
        </Button>
        <Button
          disabled={!bank}
          variant={"outline"}
          className="bg-slate-900 border-orange-500"
          onClick={() => {
            alert("Not yet implemented, tee hee!");
          }}
        >
          Transfer Transactions
        </Button>
        <Button
          disabled={!bank}
          variant={"destructive"}
          // className=" border-red-600"
          onClick={() => {
            alert("Not yet implemented, tee hee!");
          }}
        >
          Delete Bank
        </Button>
      </div>
    </div>
  );
};

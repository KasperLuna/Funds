import { Controller, useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerWithOptions } from "@/components/DatePickerWithOptions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryPicker } from "@/components/banks/CategoryPicker";
import { FormType, Transaction } from "@/lib/types";
import { BankSelect } from "@/components/banks/BankSelect";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import clsx from "clsx";
import { parseAmount } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQueryParams } from "@/lib/hooks/useQueryParams";

export const TransactionForm = ({
  transaction,
  onSubmit,
  formType = "Transaction",
}: {
  transaction?: Transaction;
  onSubmit: (data: Omit<Transaction, "date"> & { date: Date }) => void;
  formType?: FormType;
}) => {
  const { user } = useAuth();
  const { categoryData, bankData, baseCurrency } = useBanksCategsContext();
  const { queryParams } = useQueryParams();
  const bankName = queryParams["bank"];

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<
    Omit<Transaction, "date"> & {
      date: Date;
      // used for differences
      newBalance?: number;
      // used for transfers
      originBank: string;
      destinationBank: string;
      originDeduction: number;
      destinationAddition: number;
    }
  >({
    defaultValues: transaction
      ? {
          ...transaction,
          amount: Math.abs(transaction.amount),
          categories:
            // have to do this because multi-select for category doesnt allow object-based values
            transaction.categories.map((categ) => {
              return categoryData?.categories.find((cat) => cat.id === categ)
                ?.name;
            }) || [],
          date: new Date(transaction.date),
          type: ["expense", "withdrawal"].includes(transaction.type)
            ? "expense"
            : "income",
        }
      : {
          user: user?.id,
          bank: bankData?.banks.find((bank) => bank.name === bankName)?.id,
          date: new Date(new Date().setHours(0, 0, 0, 0)),
          categories: [],
          type: "expense",
        },
  });

  const selectedBank = watch("bank");
  const bankBalance = bankData?.banks.find(
    (bank) => bank.id === selectedBank
  )?.balance;

  const newBalance = watch("newBalance");
  const projectedAmount =
    !!newBalance && !!bankBalance ? newBalance - bankBalance : 0;

  const [isTransferAmountsDifferent, setIsTransferAmountsDifferent] =
    useState<boolean>(false);

  useEffect(() => {
    if (transaction) return;
    setValue("newBalance", undefined);
    setValue("amount", undefined as any);
  }, [formType, setValue, transaction]);

  return (
    <form
      onSubmit={handleSubmit((data) => {
        //#region logic for transfers
        if (formType === "Transfer") {
          if (
            data?.originBank &&
            data?.destinationBank &&
            data.originBank === data.destinationBank
          ) {
            setError("destinationBank", {
              message: "Cannot transfer to the same bank",
            });
            return;
          }

          const transaction1 = {
            ...data,
            type: "expense" as const,
            amount: Math.abs(data.originDeduction || 0),
            bank: data.originBank,
          };
          const transaction2 = {
            ...data,
            type: "income" as const,
            amount: isTransferAmountsDifferent
              ? Math.abs(data.destinationAddition || 0)
              : Math.abs(data.originDeduction || 0),
            bank: data.destinationBank,
          };

          onSubmit(transaction1);
          onSubmit(transaction2);
          return;
        }

        //#endregion

        // Submission handling is messy, TODO: refactor
        const bankBalance = bankData?.banks.find(
          (bank) => bank.id === data.bank
        )?.balance;
        const differenceAmount = !!(data?.newBalance && bankBalance)
          ? data?.newBalance - bankBalance
          : 0;
        const submitValue = {
          ...data,
          ...(formType === "Difference" && {
            type: (differenceAmount > 0 ? "income" : "expense") as any,
            amount: Math.abs(differenceAmount),
          }),
        };
        onSubmit(submitValue);
      })}
    >
      <div className="flex flex-col gap-3 pb-3">
        <div className="flex flex-col gap-1 w-full">
          <Label htmlFor="date">{"Date: "}</Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePickerWithOptions
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        {formType != "Transfer" && (
          <div className="flex flex-col gap-1 w-full">
            <Label htmlFor="date">{"Bank: "}</Label>
            <Controller
              name="bank"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <BankSelect value={field.value} onChange={field.onChange} />
              )}
            />
            {!!errors.bank && (
              <p className="text-xs text-red-500">This field is required.</p>
            )}
          </div>
        )}
        {/* Transfers are really messy, TODO: Refactor */}
        {formType === "Transfer" && (
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-1 w-full">
              <Label htmlFor="date">{"Origin Bank: "}</Label>
              <Controller
                name="originBank"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <BankSelect value={field.value} onChange={field.onChange} />
                )}
              />
              {!!errors.originBank && (
                <p className="text-xs text-red-500">This field is required.</p>
              )}
            </div>
            <ArrowRight className="size-10 mt-4" />

            <div className="w-full gap-1 flex flex-col relative">
              <Label htmlFor="amount">Destination Bank:</Label>
              <Controller
                name="destinationBank"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <BankSelect value={field.value} onChange={field.onChange} />
                )}
              />
              {!!errors.destinationBank && (
                <p className="text-xs text-red-500">
                  {errors.destinationBank?.message || "This field is required."}
                </p>
              )}
            </div>
          </div>
        )}

        <div className={clsx("flex flex-row justify-center gap-4")}>
          {formType === "Transaction" && (
            <div className="w-full flex flex-col gap-1">
              <Label htmlFor="link">{"Type: "}</Label>
              <div className="flex flex-row gap-2">
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Tabs
                      {...field}
                      className="w-full"
                      onValueChange={field.onChange}
                    >
                      <TabsList className="bg-slate-800 w-full">
                        <TabsTrigger
                          className="w-full data-[state=active]:bg-red-800 data-[state=active]:text-slate-200"
                          value={"expense"}
                        >
                          {"Deduct (-)"}
                        </TabsTrigger>
                        <TabsTrigger
                          className="w-full data-[state=active]:bg-green-800 data-[state=active]:text-slate-200"
                          value={"income"}
                        >
                          {"Add (+)"}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                />
              </div>
            </div>
          )}
          {formType === "Difference" && (
            <div className="w-full flex flex-col gap-1 justify-center">
              <p className="text-xs text-slate-300">
                Current Balance: {parseAmount(bankBalance, baseCurrency?.code)}
              </p>
              <p className="text-xs">
                Transaction Amount:{" "}
                <span
                  className={clsx({
                    "text-red-500": projectedAmount < 0,
                    "text-green-500": projectedAmount > 0,
                  })}
                >
                  {parseAmount(projectedAmount, baseCurrency?.code)}
                </span>
              </p>
            </div>
          )}
          {formType != "Transfer" && (
            <div className="w-full gap-1 flex flex-col relative">
              <Label htmlFor="amount">
                {formType === "Transaction" ? "Amount: " : "New Balance: "}
              </Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step={0.01}
                className="bg-transparent border-slate-700 focus:border-slate-600 focus-visible:ring-offset-0 focus-visible:ring-0"
                {...register(
                  formType === "Difference" ? "newBalance" : "amount",
                  {
                    valueAsNumber: true,
                    required: true,
                    min: 0,
                  }
                )}
              />
              {!!(errors.amount || errors.newBalance) && (
                <p className="text-xs text-red-500">This field is required.</p>
              )}
            </div>
          )}
          {/* Transfers are really messy, TODO: Refactor */}
          {formType === "Transfer" && (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-row gap-2 items-center">
                <div className="w-full gap-1 flex flex-col relative">
                  <Label htmlFor="amount">
                    {isTransferAmountsDifferent
                      ? "Origin Deduction:"
                      : "Transfer Amount:"}{" "}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    step={0.01}
                    className="bg-transparent border-slate-700 focus:border-slate-600 focus-visible:ring-offset-0 focus-visible:ring-0"
                    {...register("originDeduction", {
                      valueAsNumber: true,
                      required: true,
                      min: 0,
                    })}
                  />
                  {!!errors.originDeduction && (
                    <p className="text-xs text-red-500">
                      This field is required.
                    </p>
                  )}
                </div>

                {isTransferAmountsDifferent && (
                  <>
                    <ArrowRight className="size-10 mt-4" />

                    <div className="w-full gap-1 flex flex-col relative">
                      <Label htmlFor="amount">Destination Addition:</Label>
                      <Input
                        id="amount"
                        type="number"
                        inputMode="decimal"
                        step={0.01}
                        className="bg-transparent border-slate-700 focus:border-slate-600 focus-visible:ring-offset-0 focus-visible:ring-0"
                        {...register("destinationAddition", {
                          valueAsNumber: true,
                          required: true,
                          min: 0,
                        })}
                      />
                      {!!errors.destinationAddition && (
                        <p className="text-xs text-red-500">
                          This field is required.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-row items-center gap-2 text-sm">
                <Switch
                  checked={isTransferAmountsDifferent}
                  onCheckedChange={setIsTransferAmountsDifferent}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-700"
                />
                Transfer different amounts
              </div>
            </div>
          )}
        </div>
        {formType === "Difference" && (
          <small className="text-slate-400 italic">
            The amount provided in a difference will be deducted from the
            current bank balance to create a new transaction.
          </small>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor="description">{"Description: "}</Label>
          <Input
            {...register("description")}
            className="bg-transparent border-slate-700 focus:border-slate-600 focus-visible:ring-offset-0 focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="categories">{"Category: "}</Label>
          <Controller
            name="categories"
            control={control}
            render={({ field }) => (
              <CategoryPicker value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
        <div></div>
        <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-700">
          {transaction?.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};

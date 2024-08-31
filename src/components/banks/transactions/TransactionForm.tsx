import { Controller, useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerWithOptions } from "@/components/DatePickerWithOptions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryPicker } from "@/components/banks/CategoryPicker";
import { Transaction } from "@/lib/types";
import { BankSelect } from "@/components/banks/BankSelect";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";

export const TransactionForm = ({
  transaction,
  onSubmit,
}: {
  transaction?: Transaction;
  onSubmit: (data: Omit<Transaction, "date"> & { date: Date }) => void;
}) => {
  const { user } = useAuth();
  const { categoryData } = useBanksCategsContext();
  const { control, register, handleSubmit } = useForm<
    Omit<Transaction, "date"> & {
      date: Date;
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
          date: new Date(new Date().setHours(0, 0, 0, 0)),
          categories: [],
          type: "income",
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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
        <div className="flex flex-col gap-1 w-full">
          <Label htmlFor="date">{"Bank: "}</Label>
          <Controller
            name="bank"
            control={control}
            render={({ field }) => (
              <BankSelect value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex flex-row justify-center gap-4">
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
                        className="w-full data-[state=active]:bg-red-900 data-[state=active]:text-slate-200"
                        value={"expense"}
                      >
                        {"Deduct (-)"}
                      </TabsTrigger>
                      <TabsTrigger
                        className="w-full data-[state=active]:bg-green-900 data-[state=active]:text-slate-200"
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
          <div className="w-full gap-1 flex flex-col relative">
            <Label htmlFor="amount">{"Amount: "}</Label>
            <Input
              id="amount"
              type="number"
              step={0.01}
              className="bg-transparent border-slate-700 focus:border-slate-600 focus-visible:ring-offset-0 focus-visible:ring-0"
              {...register("amount", {
                valueAsNumber: true,
                required: true,
              })}
            />
          </div>
        </div>
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

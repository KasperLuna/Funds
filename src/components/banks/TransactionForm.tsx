import { Controller, useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerWithOptions } from "./DatePickerWithOptions";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { CategoryPicker } from "./CategoryPicker";
import { AppTxTypes, Type } from "@/lib/types";

export const TransactionForm = ({
  transaction,
}: {
  transaction?: AppTxTypes;
}) => {
  console.log(transaction);
  const { control, register, setValue, handleSubmit } = useForm<{
    date: Date | undefined;
    type: Type;
    amount: number;
  }>({
    defaultValues: transaction
      ? {
          ...transaction,
          type: ["expense", "withdrawal"].includes(transaction.type)
            ? "expense"
            : "income",
        }
      : {
          date: new Date(new Date().setHours(0, 0, 0, 0)),
          type: "deposit",
          amount: 1000,
        },
  });

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-3 pb-3">
        <div className="flex flex-col gap-1">
          {/* <Label htmlFor="date">{"Date: "}</Label> */}
          <Controller
            name="date"
            control={control}
            render={({ field }) => <DatePickerWithOptions {...field} />}
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
              className="bg-transparent border-slate-700 focus:border-slate-600 focus:border-0 focus:outline-0 focus:ring-0"
              {...register("amount")}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="categories">{"Category: "}</Label>
          <CategoryPicker />
        </div>
        <div></div>
        <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-700">
          Submit
        </Button>
      </div>
    </form>
  );
};

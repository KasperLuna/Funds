import { Input } from "../ui/input";
import { useForm } from "react-hook-form";
import { Bank } from "@/lib/types";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { addBank } from "@/lib/pocketbase/queries";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import React, { useMemo } from "react";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";

export const BankForm = () => {
  const { setQueryParams } = useQueryParams();
  const bankData = useBanksQuery();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Bank>();

  const onSubmit = async (data: Bank) => {
    try {
      // Check if bank already exists
      if (
        bankData?.banks?.find(
          (bank) => bank.name.toLowerCase() === data.name.toLowerCase()
        )
      ) {
        setError("name", { message: `Bank named ${data.name} already exists` });
        return;
      }
      await addBank({ name: data.name, balance: 0 });
      reset();
    } catch {
      alert("An error occurred. Try again later.");
    }
  };

  // Memoize bank list for performance
  const banksList = useMemo(() => bankData?.banks || [], [bankData]);

  return (
    <div className="flex flex-col gap-2 pb-2">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-1">
          <p className="text-sm">Input Bank Name:</p>
          <div className="flex flex-row">
            <Input
              type="text"
              placeholder="BPI, Metrobank, etc."
              {...register("name", {
                required: true,
              })}
              className="bg-transparent border-slate-700 focus:border-slate-600 focus-visible:ring-offset-0 focus-visible:ring-0 rounded-r-none"
            />
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-400 border-l-0 rounded-l-none"
            >
              <ArrowRight />
            </Button>
          </div>
          {errors.name && (
            <p className="text-red-400 text-xs">
              {errors.name.message || "Name is Required"}
            </p>
          )}
        </div>
      </form>
      <p className="text-sm">
        For your reference, here are your existing banks:
      </p>
      <div className="flex flex-row flex-wrap gap-1 bg-slate-800 p-2 border-slate-600 border-2 rounded-md">
        {banksList.length === 0 && (
          <p className="text-slate-200 text-xs">No banks yet.</p>
        )}
        {banksList.map((bank) => (
          <div
            key={bank.name}
            className="flex flex-row gap-2 items-center text-slate-200 bg-slate-700 px-2 border-2 border-slate-600 rounded-xl"
          >
            <p className="text-xs">{bank.name}</p>
          </div>
        ))}
      </div>
      <Button
        onClick={() => {
          setQueryParams({
            settings: "banks",
            create: undefined,
          });
        }}
        className="border-slate-500 border-2 text-xs h-fit w-fit mx-auto rounded-xl hover:border-slate-300"
      >
        Click here to manage your created banks{" "}
      </Button>
    </div>
  );
};

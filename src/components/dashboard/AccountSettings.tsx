import { Controller, useForm } from "react-hook-form";
import { CurrencySelector } from "./settings/CurrencySelector";
import { User } from "@/lib/types";
import { Button } from "../ui/button";
import { updateUser } from "@/lib/pocketbase/queries";
import { Input } from "../ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { thumbs } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import Image from "next/image";

export const AccountSettings = () => {
  const queryClient = useQueryClient();
  const { data } = useUserQuery();
  const avatar = createAvatar(thumbs, {
    seed: data?.username,
  });

  const {
    control,
    handleSubmit,
    register,
    setValue,
    formState: { errors },
  } = useForm<Pick<User, "username" | "currency">>({
    defaultValues: {
      username: data?.username || "",
      currency: data?.currency || {
        code: "USD",
        name: "United States Dollar",
        symbol: "$",
      },
    },
  });

  useEffect(() => {
    if (data) {
      setValue(
        "currency",
        data?.currency ?? {
          code: "USD",
          name: "United States Dollar",
          symbol: "$",
        }
      );
      setValue("username", data?.username ?? "");
    }
  }, [data, setValue]);

  const onSubmit = async (submission: Pick<User, "username" | "currency">) => {
    const formData = new FormData();
    formData.append("username", submission.username);
    formData.append("currency", JSON.stringify(submission.currency));
    // formData.append("avatar", submission.avatar as Blob);
    await updateUser(formData);
    queryClient.invalidateQueries({ queryKey: ["user"] });
    alert("Account settings updated");
  };

  return (
    <div className="w-full pb-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2 py-2 items-center">
          <Image
            src={avatar.toDataUri()}
            alt="User Profile"
            width={135}
            height={135}
            className="rounded-md"
          />
          <p className="text-xs">
            Your avatar is generated based on your username
          </p>
          <div className="flex flex-col gap-1 w-full">
            <p className="text-sm">Username:</p>
            <Input
              {...register("username", {
                required: "Username is required",
                // validation
                minLength: {
                  value: 3,
                  message: "Username must be at least 3 characters",
                },
                maxLength: {
                  value: 150,
                  message: "Username must be less than 150 characters",
                },
                pattern: {
                  value: /^[a-zA-Z0-9]+$/,
                  message: "Username must only contain letters and numbers",
                },
                // validation
              })}
              className="bg-transparent text-slate-100 w-full focus-visible:ring-offset-0 border-slate-700 transition-none focus-visible:ring-0 justify-between hover:bg-slate-700 hover:text-slate-100"
            />
            <p className="text-red-500 text-xs">{errors.username?.message}</p>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <p className="text-sm">Base Currency:</p>
            <Controller
              name="currency"
              control={control}
              render={({ field: { onChange, value } }) => {
                return <CurrencySelector value={value} onChange={onChange} />;
              }}
            />
            <p className="text-red-500 text-xs">{errors.currency?.message}</p>
          </div>
          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-400"
          >
            Save
          </Button>
        </div>
      </form>
    </div>
  );
};

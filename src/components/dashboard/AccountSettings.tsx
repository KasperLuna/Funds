import { Controller, useForm } from "react-hook-form";
import { CurrencySelector } from "./settings/CurrencySelector";
import { User } from "@/lib/types";
import { Button } from "../ui/button";
import { updateUser } from "@/lib/pocketbase/queries";
import { Input } from "../ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useUserQuery } from "@/lib/hooks/useUserQuery";

export const AccountSettings = () => {
  const queryClient = useQueryClient();
  const { data } = useUserQuery();
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

  // const baseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
  // const collectionId = data?.[0].collectionId;
  // const userId = data?.[0].id;
  // const fileName = `${baseUrl}/api/files/${collectionId}/${userId}/${data?.[0].avatar}`;

  return (
    <div className="w-full pb-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            {/* <Image src={fileName} alt="" width={250} height={250} />
            <Controller
              name="avatar"
              control={control}
              render={({ field: { onChange, value } }) => {
                return (
                  <Input
                    id="picture"
                    type="file"
                    multiple={false}
                    onChange={onChange}
                    className="bg-transparent text-slate-100 w-full focus-visible:ring-offset-0 border-slate-700 transition-none focus-visible:ring-0 justify-between hover:bg-slate-700 hover:text-slate-100"
                  />
                );
              }}
            /> */}

            <p className="text-sm">Username:</p>
            <Input
              {...register("username")}
              className="bg-transparent text-slate-100 w-full focus-visible:ring-offset-0 border-slate-700 transition-none focus-visible:ring-0 justify-between hover:bg-slate-700 hover:text-slate-100"
            />
          </div>
          <div className="flex flex-col gap-1">
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
          <Button className="w-full bg-orange-500 hover:bg-orange-400">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
};

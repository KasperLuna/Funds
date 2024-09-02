import { Controller, useForm } from "react-hook-form";
import { Category } from "@/lib/types";
import { addCategory } from "@/lib/pocketbase/queries";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { Switch } from "./ui/switch";
import { useQueryParams } from "@/lib/hooks/useQueryParams";

export const CategoryForm = ({
  setIsModalOpen,
}: {
  setIsModalOpen: (value: boolean) => void;
}) => {
  const { setQueryParams } = useQueryParams();
  const { categoryData } = useBanksCategsContext();
  const {
    control,
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Category>();

  const onSubmit = async (data: Category) => {
    if (
      categoryData?.categories?.find((category) => category.name === data.name)
    ) {
      setError("name", {
        message: `Category named ${data.name} already exists`,
      });
      return;
    }
    await addCategory({ name: data.name, hideable: data.hideable });
    reset();
  };

  return (
    <div className="flex flex-col gap-2 pb-2">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm">Input Category Name:</p>
            <Input
              type="text"
              placeholder="Food, Transportation, etc."
              {...register("name", {
                required: true,
              })}
              className="bg-transparent border-slate-700 focus:border-slate-600 focus-visible:ring-offset-0 focus-visible:ring-0"
            />
            {errors.name && (
              <p className="text-red-400 text-xs">
                {errors.name.message || "Name is Required"}
              </p>
            )}
          </div>

          <div className="flex flex-row gap-2 items-center">
            <Controller
              control={control}
              name="hideable"
              render={({ field }) => (
                <Switch
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-600"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />

            <p className="text-sm text-slate-200">{"is hideable? "}</p>
          </div>

          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-400 border-l-0"
          >
            Submit
          </Button>
        </div>
      </form>
      <p className="text-sm">
        For your reference, here are your existing categories:
      </p>
      <div className="flex flex-row flex-wrap gap-1 bg-slate-800 p-2 border-slate-600 border-2 rounded-md">
        {categoryData?.categories?.map((category) => (
          <div
            key={category.name}
            className="flex flex-row gap-2 items-center text-slate-200 bg-slate-700 px-2 border-2 border-slate-600 rounded-xl"
          >
            <p className="text-xs">{category.name}</p>
          </div>
        ))}
      </div>
      <Button
        onClick={() => {
          setQueryParams({
            settings: "categories",
          });
          setIsModalOpen(false);
        }}
        className="border-slate-500 border-2 text-xs h-fit w-fit mx-auto rounded-xl hover:border-slate-300"
      >
        Click here to manage your created categories{" "}
      </Button>
    </div>
  );
};

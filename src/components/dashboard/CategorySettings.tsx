import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { deleteCategoryById } from "@/lib/pocketbase/queries";
import { InfoIcon, Plus } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { CategorySelect } from "../banks/CategorySelect";
import { Switch } from "../ui/switch";
import { useRouter } from "next/navigation";

export const CategorySettings = () => {
  // const { queryParams, setQueryParams } = useQueryParams();
  const router = useRouter();
  const { control, watch } = useForm();
  const category = watch("category");
  return (
    <div className="flex flex-col gap-4 pb-3">
      <div className="flex flex-col gap-1 w-full">
        <Label htmlFor="date">{"Category: "}</Label>
        <div className="flex flex-row gap-1">
          <Controller
            name="category"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <CategorySelect value={field.value} onChange={field.onChange} />
            )}
          />
          <Button
            className="px-2"
            onClick={() => {
              // setQueryParams({ create: "Category", settings: undefined });
              router.push("/dashboard/banks?create=Category");
            }}
          >
            <Plus />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center gap-2">
          <Switch
            disabled={!category}
            onCheckedChange={() => {
              alert("Not yet implemented, hehez");
            }}
          />
          <span className="ml-2">Is Hideable?</span>
          <InfoIcon />
        </div>

        <Button
          disabled={!category}
          variant={"outline"}
          className="bg-slate-900 border-slate-500"
          onClick={() => {
            alert("Not yet implemented, hehez");
          }}
        >
          Rename Category
        </Button>
        <Button
          disabled={!category}
          variant={"destructive"}
          // className=" border-red-600"
          onClick={() => {
            deleteCategoryById(category);
          }}
        >
          Delete Category
        </Button>
      </div>
    </div>
  );
};

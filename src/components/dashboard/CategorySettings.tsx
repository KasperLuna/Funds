import {
  deleteCategoryById,
  updateCategoryById,
} from "@/lib/pocketbase/queries";
import { InfoIcon, Plus } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { CategorySelect } from "../banks/CategorySelect";
import { Switch } from "../ui/switch";
import { useRouter } from "next/navigation";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { Tooltip } from "../ui/tooltip";
import React, { useMemo, useState } from "react";

export const CategorySettings = () => {
  const router = useRouter();
  const { categoryData } = useBanksCategsContext();
  const { control, watch, setValue } = useForm();
  const categoryId = watch("category");

  // Find the selected category object
  const selectedCategory = useMemo(
    () => categoryData?.categories?.find((c) => c.id === categoryId),
    [categoryId, categoryData]
  );

  // State for rename modal
  const [showRename, setShowRename] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [renameError, setRenameError] = useState("");

  //#region: Budget Management, refactor later
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [budgetError, setBudgetError] = useState("");

  // Update budgetInput when selectedCategory changes
  React.useEffect(() => {
    if (selectedCategory && selectedCategory.monthly_budget != null) {
      setBudgetInput(selectedCategory.monthly_budget.toString());
    } else {
      setBudgetInput("");
    }
  }, [selectedCategory]);

  // Debounced update handler using a ref to persist timer
  const budgetDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBudgetInput(value);
    if (budgetDebounceRef.current) clearTimeout(budgetDebounceRef.current);
    const trimmed = value.trim();
    let numValue: number | undefined = undefined;
    if (trimmed !== "") {
      numValue = Number(trimmed);
      if (isNaN(numValue) || numValue < 0) {
        setBudgetError("Monthly budget must be a positive number or empty.");
        return;
      }
    }
    setBudgetError("");
    budgetDebounceRef.current = setTimeout(() => {
      if (
        selectedCategory &&
        numValue !== selectedCategory.monthly_budget &&
        (numValue === undefined || !isNaN(numValue))
      ) {
        updateCategoryById(selectedCategory.id, { monthly_budget: numValue });
        categoryData?.refetch?.();
      }
    }, 800);
  };
  //#endregion

  const handleToggle = async (
    field: "hideable" | "total_exempt",
    value: boolean
  ) => {
    if (!categoryId) return;
    await updateCategoryById(categoryId, { [field]: value });
    categoryData?.refetch?.();
  };

  const handleRename = async () => {
    if (!selectedCategory) return;
    if (renameInput.trim() === "") {
      setRenameError("Category name cannot be empty.");
      return;
    }
    await updateCategoryById(selectedCategory.id, { name: renameInput.trim() });
    setShowRename(false);
    setRenameInput("");
    setRenameError("");
    categoryData?.refetch?.();
  };

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
          <Tooltip content="If enabled, this category can be hidden from breakdowns and reports.">
            <Switch
              disabled={!categoryId}
              checked={!!selectedCategory?.hideable}
              onCheckedChange={(checked) => handleToggle("hideable", checked)}
            />
          </Tooltip>
          <span className="ml-2">Is Hideable?</span>
          <InfoIcon />
        </div>
        <div className="flex flex-row items-center gap-2">
          <Tooltip content="If enabled, transactions in this category will be excluded from the total at the top of the dashboard.">
            <Switch
              disabled={!categoryId}
              checked={!!selectedCategory?.total_exempt}
              onCheckedChange={(checked) =>
                handleToggle("total_exempt", checked)
              }
            />
          </Tooltip>
          <span className="ml-2">Total Exempt</span>
          <Tooltip content="Excludes this category from the dashboard total. Useful for savings, investments, or internal transfers.">
            <InfoIcon />
          </Tooltip>
        </div>
        <div className="flex flex-row items-center gap-2">
          <span className="ml-2">Monthly Budget:</span>
          <input
            className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-100 w-28"
            type="number"
            step="0.01"
            min="0"
            value={budgetInput}
            disabled={!categoryId}
            onChange={handleBudgetInputChange}
            placeholder="e.g. 5000"
          />
          <span className="ml-1 text-slate-200">
            {selectedCategory?.monthly_budget != null &&
            !isNaN(Number(selectedCategory.monthly_budget)) ? (
              `₱${selectedCategory.monthly_budget}`
            ) : (
              <span className="italic text-slate-400">Not set</span>
            )}
          </span>
          {budgetError && (
            <span className="text-red-500 text-xs ml-2">{budgetError}</span>
          )}
        </div>
        <Button
          disabled={!categoryId}
          variant={"outline"}
          className="bg-slate-900 border-slate-500"
          onClick={() => setShowRename(true)}
        >
          Rename Category
        </Button>
        <Button
          disabled={!categoryId}
          variant={"destructive"}
          onClick={() => {
            deleteCategoryById(categoryId);
          }}
        >
          Delete Category
        </Button>
      </div>
      {/* Rename Modal */}
      {showRename && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col gap-3 min-w-[320px]">
            <h2 className="text-lg font-bold text-slate-100">
              Rename Category
            </h2>
            <p className="text-slate-300 text-sm mb-2">
              Type the new name for <b>{selectedCategory?.name}</b> below:
            </p>
            <input
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-100"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              placeholder="New category name"
              autoFocus
            />
            {renameError && (
              <span className="text-red-500 text-xs">{renameError}</span>
            )}
            <div className="flex gap-2 mt-2">
              <Button onClick={() => setShowRename(false)}>Cancel</Button>
              <Button
                // variant="default"
                onClick={handleRename}
                disabled={
                  renameInput.trim() === "" ||
                  renameInput.trim() === selectedCategory?.name
                }
              >
                Confirm Rename
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

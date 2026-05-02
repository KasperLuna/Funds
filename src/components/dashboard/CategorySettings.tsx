import {
  deleteCategoryById,
  updateCategoryById,
} from "@/lib/pocketbase/queries";
import {
  FolderOpen,
  Edit3,
  Trash2,
  DollarSign,
  EyeOff,
  Calculator,
  Plus,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { CategorySelect } from "../banks/CategorySelect";
import { Switch } from "../ui/switch";
import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../ui/toast";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { LoadingSpinner } from "../ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export const CategorySettings = () => {
  const categoryData = useCategoriesQuery();
  const { addToast } = useToast();
  const { control, watch } = useForm();
  const categoryId = watch("category");

  // Find the selected category object
  const selectedCategory = useMemo(
    () => categoryData?.categories?.find((c) => c.id === categoryId),
    [categoryId, categoryData],
  );

  const {
    register: registerRename,
    handleSubmit: handleRenameSubmit,
    formState: renameFormState,
    reset: resetRenameForm,
    watch: watchRename,
  } = useForm({ defaultValues: { name: "" } });
  const watchedNewName = watchRename("name");

  // State management
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: "hideable" | "total_exempt";
      value: boolean;
    }) => {
      if (!categoryId) return;
      await updateCategoryById(categoryId, { [field]: value });
      await categoryData?.refetch?.();
    },
    onSuccess: (_, { field, value }) =>
      addToast({
        type: "success",
        title: "Setting updated",
        description: `${field === "hideable" ? "Hideable" : "Total exempt"} setting has been ${value ? "enabled" : "disabled"}.`,
      }),
    onError: () =>
      addToast({
        type: "error",
        title: "Update failed",
        description: "Failed to update category setting. Please try again.",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategory) return;
      await deleteCategoryById(selectedCategory.id);
      await categoryData?.refetch?.();
    },
    onSuccess: () => {
      setShowDelete(false);
      addToast({
        type: "success",
        title: "Category deleted",
        description: "Category and all associated data have been removed.",
      });
    },
    onError: () =>
      addToast({
        type: "error",
        title: "Deletion failed",
        description: "Failed to delete category. Please try again.",
      }),
  });

  const budgetMutation = useMutation({
    mutationFn: async (numValue: number | undefined) => {
      if (!selectedCategory) return;
      await updateCategoryById(selectedCategory.id, {
        monthly_budget: numValue,
      });
      await categoryData?.refetch?.();
    },
    onSuccess: (_, numValue) =>
      addToast({
        type: "success",
        title: "Budget updated",
        description: numValue
          ? `Monthly budget set to ${numValue}`
          : "Monthly budget removed",
      }),
    onError: () =>
      addToast({
        type: "error",
        title: "Budget update failed",
        description: "Failed to update monthly budget. Please try again.",
      }),
  });

  // Budget Management State
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [budgetError, setBudgetError] = useState("");
  React.useEffect(() => {
    resetRenameForm({ name: selectedCategory?.name ?? "" });
    setBudgetInput(selectedCategory?.monthly_budget?.toString() || "");
  }, [selectedCategory, resetRenameForm]);

  // Sync form fields when selected category changes
  const budgetDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBudgetInput(value);
    setBudgetError("");

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

    budgetDebounceRef.current = setTimeout(() => {
      if (
        selectedCategory &&
        numValue !== selectedCategory.monthly_budget &&
        (numValue === undefined || !isNaN(numValue))
      ) {
        budgetMutation.mutate(numValue);
      }
    }, 800);
  };

  const handleToggle = (field: "hideable" | "total_exempt", value: boolean) => {
    toggleMutation.mutate({ field, value });
  };

  const handleRename = handleRenameSubmit(async ({ name }) => {
    if (!selectedCategory) return;
    try {
      await updateCategoryById(selectedCategory.id, { name: name.trim() });
      await categoryData?.refetch?.();
      setShowRename(false);
      addToast({
        type: "success",
        title: "Category renamed",
        description: `Category has been renamed to "${name.trim()}".`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Rename failed",
        description: "Failed to rename category. Please try again.",
      });
    }
  });

  const handleDelete = () => deleteMutation.mutate();

  return (
    <div className="space-y-3 pb-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-white text-base">
            <FolderOpen className="w-4 h-4" />
            <span>Category Management</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Manage your transaction categories and their settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Category Selection */}
          <div className="space-y-1">
            <Label className="text-white flex items-center space-x-1 text-sm">
              <FolderOpen className="w-3 h-3" />
              <span>Select Category</span>
            </Label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Controller
                  name="category"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <CategorySelect
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-orange-500 hover:bg-orange-600 border-orange-500 px-3"
                    aria-label="How to add a category"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-slate-800 border-slate-700 text-slate-200 text-sm w-56 p-3">
                  Type a new name in the selector to create a category.
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {selectedCategory && (
            <>
              <Separator className="bg-slate-600" />

              {/* Category Settings */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white">
                  Category Settings
                </h3>

                {/* Hideable Setting */}
                <div className="flex items-center justify-between p-2 bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <EyeOff className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-white font-medium text-sm">
                        Privacy Hidden
                      </p>
                      <p className="text-xs text-slate-400">
                        This category&apos;s transactions will be hidden when
                        privacy mode is enabled.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {toggleMutation.isPending &&
                      toggleMutation.variables?.field === "hideable" && (
                        <LoadingSpinner size="sm" />
                      )}
                    <Switch
                      disabled={
                        !categoryId ||
                        (toggleMutation.isPending &&
                          toggleMutation.variables?.field === "hideable")
                      }
                      checked={!!selectedCategory?.hideable}
                      onCheckedChange={(checked) =>
                        handleToggle("hideable", checked)
                      }
                    />
                  </div>
                </div>

                {/* Total Exempt Setting */}
                <div className="flex items-center justify-between p-2 bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-white font-medium text-sm">
                        Exclude from balance totals
                      </p>
                      <p className="text-xs text-slate-400">
                        Transactions in this category won&apos;t affect your
                        overall balance total.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {toggleMutation.isPending &&
                      toggleMutation.variables?.field === "total_exempt" && (
                        <LoadingSpinner size="sm" />
                      )}
                    <Switch
                      disabled={
                        !categoryId ||
                        (toggleMutation.isPending &&
                          toggleMutation.variables?.field === "total_exempt")
                      }
                      checked={!!selectedCategory?.total_exempt}
                      onCheckedChange={(checked) =>
                        handleToggle("total_exempt", checked)
                      }
                    />
                  </div>
                </div>

                {/* Monthly Budget */}
                <div className="p-2 bg-slate-700 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <p className="text-white font-medium text-sm">
                      Monthly Budget
                    </p>
                    {budgetMutation.isPending && <LoadingSpinner size="sm" />}
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={budgetInput}
                      disabled={!categoryId || budgetMutation.isPending}
                      onChange={handleBudgetInputChange}
                      placeholder="Enter monthly budget (optional)"
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    {budgetError && (
                      <p className="text-red-400 text-sm">{budgetError}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      Set a monthly spending limit for this category. Leave
                      empty for no limit.
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-600" />

              {/* Category Actions */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">
                  Category Actions
                </h3>

                <Button
                  disabled={!categoryId}
                  variant="outline"
                  onClick={() => setShowRename(true)}
                  className="w-full bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 hover:text-white"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Rename Category
                </Button>

                <Button
                  disabled={!categoryId}
                  variant="destructive"
                  onClick={() => setShowDelete(true)}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Category
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <AlertDialog open={showRename} onOpenChange={setShowRename}>
        <AlertDialogContent className="bg-slate-900 text-white border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Edit3 className="w-5 h-5" />
              <span>Rename Category</span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <p className="text-slate-300">
              Enter a new name for{" "}
              <span className="font-semibold">{selectedCategory?.name}</span>:
            </p>
            <Input
              {...registerRename("name", { required: true })}
              placeholder="New category name"
              className="bg-slate-800 border-slate-600 text-white"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRename(false)}
                disabled={renameFormState.isSubmitting}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={
                  !watchedNewName.trim() ||
                  watchedNewName.trim() === selectedCategory?.name ||
                  renameFormState.isSubmitting
                }
                className="bg-orange-500 hover:bg-orange-600"
              >
                {renameFormState.isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Renaming...
                  </>
                ) : (
                  "Rename"
                )}
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Category"
        description={`This will permanently delete "${selectedCategory?.name}" and all associated transactions. This action cannot be undone.`}
        confirmText="Delete Category"
        variant="destructive"
        confirmationPhrase={`DELETE ${selectedCategory?.name}`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

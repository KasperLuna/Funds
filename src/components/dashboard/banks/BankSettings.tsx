import { BankSelect } from "@/components/banks/BankSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  recomputeBalanceById,
  deleteBankById,
  renameBankById,
} from "@/lib/pocketbase/queries";
import { parseAmount } from "@/lib/utils";
import {
  Building2,
  DollarSign,
  Calculator,
  Edit3,
  Trash2,
  Plus,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const BankSettings = () => {
  const bankData = useBanksQuery();
  const { baseCurrency } = useUserQuery();
  const { addToast } = useToast();
  const { control, watch } = useForm();
  const bank = watch("bank");
  const selectedBank = bankData?.banks?.find((b) => b.id === bank);

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

  const recomputeMutation = useMutation({
    mutationFn: async () => {
      if (!bank) return;
      await recomputeBalanceById(bank);
      await bankData?.refetch?.();
    },
    onSuccess: () =>
      addToast({
        type: "success",
        title: "Balance recomputed",
        description: "Bank balance has been recalculated successfully.",
      }),
    onError: () =>
      addToast({
        type: "error",
        title: "Recomputation failed",
        description: "Failed to recompute balance. Please try again.",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBank) return;
      await deleteBankById(selectedBank.id);
      await bankData?.refetch?.();
    },
    onSuccess: () => {
      setShowDelete(false);
      addToast({
        type: "success",
        title: "Bank deleted",
        description: "Bank and all associated data have been removed.",
      });
    },
    onError: () =>
      addToast({
        type: "error",
        title: "Deletion failed",
        description: "Failed to delete bank. Please try again.",
      }),
  });

  React.useEffect(() => {
    if (selectedBank && showRename) {
      resetRenameForm({ name: selectedBank.name });
    }
  }, [selectedBank, showRename, resetRenameForm]);

  const handleRecomputeBalance = () => recomputeMutation.mutate();
  const handleDelete = () => deleteMutation.mutate();

  const handleRename = handleRenameSubmit(async ({ name }) => {
    if (!selectedBank) return;
    try {
      await renameBankById(selectedBank.id, name.trim());
      await bankData?.refetch?.();
      setShowRename(false);
      addToast({
        type: "success",
        title: "Bank renamed",
        description: `Bank has been renamed to "${name.trim()}".`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Rename failed",
        description: "Failed to rename bank. Please try again.",
      });
    }
  });

  return (
    <div className="space-y-3">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-white text-base">
            <Building2 className="w-4 h-4" />
            <span>Bank Management</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Manage your banks and their settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Bank Selection */}
          <div className="space-y-1">
            <Label className="text-white flex items-center space-x-1 text-sm">
              <Building2 className="w-3 h-3" />
              <span>Select Bank</span>
            </Label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Controller
                  name="bank"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <BankSelect value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-orange-500 hover:bg-orange-600 border-orange-500 px-3"
                    aria-label="How to add a bank"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-slate-800 border-slate-700 text-slate-200 text-sm w-56 p-3">
                  Type a new name in the selector to create a bank.
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Bank Info */}
          {selectedBank && (
            <div className="p-2 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white text-sm">
                    {selectedBank.name}
                  </h3>
                  <p className="text-xs text-slate-300 flex items-center space-x-1">
                    <DollarSign className="w-3 h-3" />
                    <span>
                      Balance:{" "}
                      {parseAmount(selectedBank?.balance, baseCurrency?.code)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator className="bg-slate-600" />

          {/* Bank Actions */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Bank Actions</h3>

            <Button
              disabled={!bank || recomputeMutation.isPending}
              variant="outline"
              onClick={handleRecomputeBalance}
              className="w-full border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 text-sm py-2"
            >
              {recomputeMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Recomputing...
                </>
              ) : (
                <>
                  <Calculator className="w-3 h-3 mr-2" />
                  Recompute Balance
                </>
              )}
            </Button>
            <p className="text-xs text-slate-400 -mt-1">
              Recalculates the bank balance by summing all recorded
              transactions. Use this if the balance looks incorrect.
            </p>

            <Button
              disabled={!bank}
              variant="outline"
              onClick={() => setShowRename(true)}
              className="w-full border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 text-sm py-2"
            >
              <Edit3 className="w-3 h-3 mr-2" />
              Rename Bank
            </Button>

            <Button
              disabled={!bank}
              variant="destructive"
              onClick={() => setShowDelete(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-sm py-2"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete Bank
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <AlertDialog open={showRename} onOpenChange={setShowRename}>
        <AlertDialogContent className="bg-slate-900 text-white border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Edit3 className="w-5 h-5" />
              <span>Rename Bank</span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <p className="text-slate-300">
              Enter a new name for{" "}
              <span className="font-semibold">{selectedBank?.name}</span>:
            </p>
            <Input
              {...registerRename("name", { required: true })}
              placeholder="New bank name"
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
                  watchedNewName.trim() === selectedBank?.name ||
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
        title="Delete Bank"
        description={`This will permanently delete "${selectedBank?.name}" and all associated transactions. This action cannot be undone.`}
        confirmText="Delete Bank"
        variant="destructive"
        confirmationPhrase={`DELETE ${selectedBank?.name}`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

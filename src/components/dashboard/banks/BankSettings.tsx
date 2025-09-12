import { BankSelect } from "@/components/banks/BankSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import {
  recomputeBalanceById,
  deleteBankById,
  renameBankById,
} from "@/lib/pocketbase/queries";
import { parseAmount } from "@/lib/utils";
import {
  Plus,
  Building2,
  DollarSign,
  Calculator,
  Edit3,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import React, { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const BankSettings = () => {
  const router = useRouter();
  const { bankData, baseCurrency } = useBanksCategsContext();
  const { addToast } = useToast();
  const { control, watch } = useForm();
  const bank = watch("bank");
  const selectedBank = bankData?.banks?.find((b) => b.id === bank);

  // State management
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isRecomputingBalance, setIsRecomputingBalance] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newBankName, setNewBankName] = useState("");

  React.useEffect(() => {
    if (selectedBank && showRename) {
      setNewBankName(selectedBank.name);
    }
  }, [selectedBank, showRename]);

  const handleRecomputeBalance = async () => {
    if (!bank) return;

    setIsRecomputingBalance(true);
    try {
      await recomputeBalanceById(bank);
      await bankData?.refetch?.();
      addToast({
        type: "success",
        title: "Balance recomputed",
        description: "Bank balance has been recalculated successfully.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Recomputation failed",
        description: "Failed to recompute balance. Please try again.",
      });
    } finally {
      setIsRecomputingBalance(false);
    }
  };

  const handleRename = async () => {
    if (!selectedBank || !newBankName.trim()) return;

    setIsRenaming(true);
    try {
      await renameBankById(selectedBank.id, newBankName.trim());
      await bankData?.refetch?.();
      setShowRename(false);
      addToast({
        type: "success",
        title: "Bank renamed",
        description: `Bank has been renamed to "${newBankName.trim()}".`,
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Rename failed",
        description: "Failed to rename bank. Please try again.",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBank) return;

    setIsDeleting(true);
    try {
      await deleteBankById(selectedBank.id);
      await bankData?.refetch?.();
      setShowDelete(false);
      addToast({
        type: "success",
        title: "Bank deleted",
        description: "Bank and all associated data have been removed.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Deletion failed",
        description: "Failed to delete bank. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

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
              <Button
                onClick={() => router.push("/dashboard/banks?create=Bank")}
                className="bg-orange-500 hover:bg-orange-600 px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
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
              disabled={!bank || isRecomputingBalance}
              variant="outline"
              onClick={handleRecomputeBalance}
              className="w-full border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 text-sm py-2"
            >
              {isRecomputingBalance ? (
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
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="bg-slate-900 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit3 className="w-5 h-5" />
              <span>Rename Bank</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-300">
              Enter a new name for{" "}
              <span className="font-semibold">{selectedBank?.name}</span>:
            </p>
            <Input
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="New bank name"
              className="bg-slate-800 border-slate-600 text-white"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRename(false)}
                disabled={isRenaming}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={
                  !newBankName.trim() ||
                  newBankName.trim() === selectedBank?.name ||
                  isRenaming
                }
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isRenaming ? (
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
        </DialogContent>
      </Dialog>

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
        loading={isDeleting}
      />
    </div>
  );
};

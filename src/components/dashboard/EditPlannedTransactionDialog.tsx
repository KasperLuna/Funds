"use client";
import React, { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PlannedTransactionForm } from "@/components/banks/PlannedTransactionForm";
import { PlannedTransaction } from "@/lib/types";
import { usePlannedTransactions } from "@/hooks/usePlannedTransactions";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Decimal } from "decimal.js";

interface EditPlannedTransactionDialogProps {
  plannedTransaction: PlannedTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPlannedTransactionDialog({
  plannedTransaction,
  open,
  onOpenChange,
}: EditPlannedTransactionDialogProps) {
  const { updatePlannedTransaction, deletePlannedTransaction } =
    usePlannedTransactions();
  const categoryData = useCategoriesQuery();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = useCallback(
    async (pt: PlannedTransaction) => {
      if (!plannedTransaction?.id) return;
      const mappedCategories =
        pt.categories.map(
          (categ) =>
            categoryData?.categories.find((cat) => cat.name === categ)?.id ||
            categ,
        ) || [];
      await updatePlannedTransaction({
        ...pt,
        id: plannedTransaction.id,
        amount: ["expense", "withdrawal"].includes(pt.type)
          ? new Decimal(pt.amount).abs().negated().toNumber()
          : new Decimal(pt.amount).abs().toNumber(),
        categories: mappedCategories,
      });
      onOpenChange(false);
    },
    [plannedTransaction, updatePlannedTransaction, categoryData, onOpenChange],
  );

  const handleDelete = useCallback(async () => {
    if (!plannedTransaction?.id) return;
    await deletePlannedTransaction(plannedTransaction.id);
    onOpenChange(false);
    setConfirmDelete(false);
  }, [plannedTransaction, deletePlannedTransaction, onOpenChange]);

  if (!plannedTransaction) return null;

  // Prepare the planned transaction for the form — amounts are stored negative for expenses,
  // but the form expects positive values with type controlling the sign
  const formPt: PlannedTransaction = {
    ...plannedTransaction,
    amount: Math.abs(plannedTransaction.amount),
    // Map category IDs back to names for the form
    categories: plannedTransaction.categories.map((catId) => {
      const cat = categoryData?.categories.find((c) => c.id === catId);
      return cat?.name || catId;
    }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 text-white border-2 border-slate-800 px-4 py-4 rounded-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            Edit Planned Transaction
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Modify the schedule, amount, or details of this planned transaction.
          </DialogDescription>
        </DialogHeader>
        <PlannedTransactionForm
          plannedTransaction={formPt}
          onSubmit={handleSubmit}
        />
        <div className="border-t border-slate-700 pt-3 mt-1">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-400">Are you sure?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="bg-red-700 hover:bg-red-600"
              >
                Yes, delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="border-slate-600 hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/30 gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete planned transaction
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

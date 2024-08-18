import { TransactionForm } from "./TransactionForm";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogFooter,
  // AlertDialogDescription,
  // AlertDialogCancel,
  // AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";
import { AppTxTypes } from "@/lib/types";

export function TransactionDialog({
  trigger,
  isModalOpen,
  setIsModalOpen,
  transaction,
}: {
  trigger?: React.ReactNode;
  isModalOpen: boolean;
  setIsModalOpen: (value: boolean) => void;
  transaction?: AppTxTypes;
}) {
  return (
    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      {trigger && <AlertDialogTrigger>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent
        className="bg-slate-900 text-white border-2 border-slate-800 px-4 py-1"
        aria-describedby={undefined}
      >
        <AlertDialogHeader className="flex flex-row w-full justify-between items-center">
          <AlertDialogTitle>Add Transaction</AlertDialogTitle>
          <AlertDialogCancel className="w-fit bg-transparent p-2 rounded-xl border-slate-700 hover:bg-slate-400">
            <X />
          </AlertDialogCancel>
        </AlertDialogHeader>
        <TransactionForm transaction={transaction} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

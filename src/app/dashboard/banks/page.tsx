"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BankSelect } from "@/components/banks/BankSelect";
import { BankForm } from "@/components/banks/BankForm";
import { TransactionForm } from "@/components/banks/transactions/TransactionForm";
import { TransactionsContainer } from "@/components/banks/transactions/TransactionsContainer";
import { useBanks } from "@/lib/hooks/useBanks";
import { useTransactions, useDeleteTransaction } from "@/lib/hooks/useTransactions";
import { useCategories } from "@/lib/hooks/useCategories";
import type { Transaction, TransactionFilters } from "@/lib/types";

export default function BanksPage() {
  const { data: banks = [] } = useBanks();
  const { data: categories = [] } = useCategories();

  const [selectedBankId, setSelectedBankId] = useState<string | undefined>(undefined);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const { data: transactions = [] } = useTransactions(selectedBankId, filters);

  const deleteMutation = useDeleteTransaction();

  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setTxDialogOpen(true);
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    if (tx.id) deleteMutation.mutate(tx.id);
  };

  const handleTxDialogClose = () => {
    setTxDialogOpen(false);
    setEditingTx(undefined);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Banks</h1>
        <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="size-4" data-icon="inline-start" />
                Add Bank
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Bank</DialogTitle>
            </DialogHeader>
            <BankForm onSuccess={() => setBankDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <BankSelect banks={banks} value={selectedBankId} onValueChange={setSelectedBankId} />
        </div>

        <Dialog
          open={txDialogOpen}
          onOpenChange={(open) => {
            setTxDialogOpen(open);
            if (!open) setEditingTx(undefined);
          }}
        >
          <DialogTrigger
            render={
              <Button size="sm" variant="outline">
                <Plus className="size-4" data-icon="inline-start" />
                Add Transaction
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTx ? "Edit Transaction" : "Create Transaction"}</DialogTitle>
            </DialogHeader>
            <TransactionForm
              key={editingTx?.id ?? "new"}
              initialData={editingTx}
              banks={banks}
              categories={categories}
              onSuccess={handleTxDialogClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      <section aria-label="Transactions">
        <TransactionsContainer
          transactions={transactions}
          banks={banks}
          categories={categories}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          onFiltersChange={setFilters}
        />
      </section>
    </div>
  );
}

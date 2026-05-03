import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Copy, Trash2, X } from "lucide-react";
import { FormType, Transaction } from "@/lib/types";
import { pb } from "@/lib/pocketbase/pocketbase";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Decimal } from "decimal.js";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import useMediaQuery from "@/lib/hooks/useMediaQuery";
import dynamic from "next/dynamic";

// Dynamic import for TransactionForm — only loaded when needed
const TransactionForm = dynamic(
  () =>
    import("./transactions/TransactionForm").then((m) => ({
      default: m.TransactionForm,
    })),
  { loading: () => <FormLoader /> },
);

const TRANSACTION_FORM_TYPES = [
  { value: "Transaction", description: "Add an income or expense" },
  { value: "Transfer", description: "Move funds between banks" },
  { value: "Difference", description: "Correct a balance to a new value" },
] as const;

type TransactionFormType = (typeof TRANSACTION_FORM_TYPES)[number]["value"];

function FormLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
    </div>
  );
}

/** In-app delete confirmation dialog */
function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}>) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 text-white border-2 border-slate-800 px-4 py-4 rounded-md max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            This will permanently delete the transaction and adjust the bank
            balance. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-row justify-end gap-2 mt-2">
          <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 mt-0">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-700 hover:bg-red-600 text-white"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const MixedDialogTrigger = ({
  children,
  transaction,
  onPlannedSubmit,
  isMobile = false,
}: {
  children: React.ReactNode;
  transaction?: Transaction;
  onPlannedSubmit?: () => void | Promise<void>;
  isMobile?: boolean;
}) => {
  const { queryParams, setQueryParams } = useQueryParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isCreateModalOpen = !!queryParams["create"];
  const setIsCreateModalOpen = useCallback(
    (value: boolean) => {
      setQueryParams({ create: value ? "Transaction" : undefined });
    },
    [setQueryParams],
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use media query to determine if we're on mobile
  const isActuallyMobile = useMediaQuery("(max-width: 768px)");

  // Before mount: render for both instances to match SSR output (avoids hydration mismatch)
  // After mount: only render the one matching the current screen size
  const shouldRenderDialog =
    !mounted || transaction != null || isMobile === isActuallyMobile;

  return shouldRenderDialog ? (
    <MixedDialog
      isModalOpen={transaction ? isEditModalOpen : isCreateModalOpen}
      setIsModalOpen={transaction ? setIsEditModalOpen : setIsCreateModalOpen}
      trigger={children}
      transaction={transaction}
      onPlannedSubmit={onPlannedSubmit}
    />
  ) : (
    <>{children}</>
  );
};

export const MixedDialog = ({
  trigger,
  isModalOpen,
  setIsModalOpen,
  transaction,
  onPlannedSubmit,
}: {
  trigger?: React.ReactNode;
  isModalOpen: boolean;
  setIsModalOpen: (value: boolean) => void;
  transaction?: Transaction;
  onPlannedSubmit?: () => void | Promise<void>;
}) => {
  const { queryParams, setQueryParams } = useQueryParams();
  const bankData = useBanksQuery();
  const categoryData = useCategoriesQuery();
  const queryClient = useQueryClient();
  const rawFormType = queryParams["create"] ?? "Transaction";
  const formType: TransactionFormType = (
    ["Transaction", "Transfer", "Difference"] as const
  ).includes(rawFormType as TransactionFormType)
    ? (rawFormType as TransactionFormType)
    : "Transaction";
  const setFormType = useCallback(
    (value: string) => setQueryParams({ create: value }),
    [setQueryParams],
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Memoize bank lookups for performance
  const originalBank = useMemo(
    () => bankData?.banks.find((bank) => bank.id === transaction?.bank),
    [bankData, transaction],
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["bankTrends"] });
    queryClient.invalidateQueries({ queryKey: ["transactionsOfMonth"] });
  }, [queryClient]);

  // Memoize onSubmit handler
  const onSubmit = useCallback(
    async (batch: Array<Omit<Transaction, "date"> & { date: Date }>) => {
      try {
        setIsModalOpen(false);
        const batcher = pb.createBatch();
        for (const data of batch) {
          const parsedData = {
            ...data,
            categories:
              data.categories.map(
                (categ) =>
                  categoryData?.categories.find((cat) => cat.name === categ)
                    ?.id || "",
              ) || [],
            amount: ["expense", "withdrawal"].includes(data.type)
              ? new Decimal(data.amount).negated().toNumber()
              : new Decimal(data.amount).toNumber(),
          };
          const transactionBank = bankData?.banks.find(
            (bank) => bank.id === parsedData.bank,
          );
          if (!transactionBank?.id || !parsedData)
            throw new Error("Error updating bank balance");
          if (data.id) {
            // Update existing transaction
            batcher.collection("transactions").update(data.id, parsedData);
            const original = transaction;
            const origBank = bankData?.banks.find(
              (bank) => bank.id === original?.bank,
            );
            if (!original || !origBank)
              throw new Error("Original transaction/bank not found");
            if (origBank.id === transactionBank.id) {
              batcher.collection("banks").update(transactionBank.id, {
                balance: new Decimal(transactionBank.balance)
                  .sub(new Decimal(original.amount))
                  .add(new Decimal(parsedData.amount))
                  .toNumber(),
              });
            } else {
              batcher.collection("banks").update(origBank.id, {
                balance: new Decimal(origBank.balance)
                  .sub(new Decimal(original.amount))
                  .toNumber(),
              });
              batcher.collection("banks").update(transactionBank.id, {
                balance: new Decimal(transactionBank.balance)
                  .add(new Decimal(parsedData.amount))
                  .toNumber(),
              });
            }
          } else {
            batcher
              .collection("transactions")
              .create(parsedData, { requestKey: null });
            batcher.collection("banks").update(transactionBank.id, {
              balance: new Decimal(transactionBank.balance)
                .add(new Decimal(parsedData.amount))
                .toNumber(),
            });
          }
        }
        await batcher.send();
        invalidateAll();
        if (onPlannedSubmit) {
          await onPlannedSubmit();
          queryClient.invalidateQueries({ queryKey: ["plannedTransactions"] });
        }
      } catch (error) {
        console.error("Transaction error:", error);
      }
    },
    [
      categoryData,
      setIsModalOpen,
      bankData,
      queryClient,
      onPlannedSubmit,
      transaction,
      invalidateAll,
    ],
  );

  const handleDuplicate = useCallback(() => {
    if (!transaction) return;
    setIsModalOpen(false);
    const { id, ...rest } = transaction;
    const transactionBank = bankData?.banks.find(
      (bank) => bank.id === rest.bank,
    );
    const batch = pb.createBatch();
    if (!transactionBank?.id || !rest)
      throw new Error("Error updating bank balance");
    batch.collection("transactions").create(rest);
    batch.collection("banks").update(transactionBank.id, {
      balance: new Decimal(transactionBank.balance)
        .add(new Decimal(rest.amount))
        .toNumber(),
    });
    batch.send().then(invalidateAll);
  }, [transaction, setIsModalOpen, bankData, invalidateAll]);

  const handleDeleteConfirmed = useCallback(() => {
    if (!transaction) return;
    setShowDeleteConfirm(false);
    setIsModalOpen(false);
    const batch = pb.createBatch();
    batch.collection("transactions").delete(transaction.id as string);
    if (!originalBank?.id || !transaction)
      throw new Error("Error updating bank balance");
    batch.collection("banks").update(originalBank.id, {
      balance: new Decimal(originalBank.balance)
        .sub(new Decimal(transaction.amount))
        .toNumber(),
    });
    batch.send().then(invalidateAll);
  }, [transaction, setIsModalOpen, originalBank, invalidateAll]);

  return (
    <>
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteConfirmed}
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent
          hideClose
          className="bg-slate-900 text-white border-2 border-slate-800 px-4 py-2 rounded-md"
          style={{ overscrollBehavior: "contain" }}
        >
          <DialogDescription className="sr-only">
            {transaction?.id
              ? "Edit an existing transaction"
              : "Create a new transaction"}
          </DialogDescription>
          <DialogHeader className="flex flex-row w-full items-center justify-between">
            <DialogTitle className="self-center">
              {transaction?.id ? "Edit" : "Create"}{" "}
              {transaction?.id ? (
                "Transaction"
              ) : (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-slate-800 hover:bg-slate-600 gap-1 hover:text-slate-200 py-[3px] text-base border-slate-600 px-2 h-fit"
                    >
                      {formType} <ChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-700 text-slate-100 border-0">
                    <DropdownMenuRadioGroup
                      value={formType}
                      onValueChange={setFormType}
                    >
                      {TRANSACTION_FORM_TYPES.map(({ value, description }) => (
                        <DropdownMenuRadioItem
                          key={value}
                          value={value}
                          className="hover:bg-slate-600 flex-col items-start"
                        >
                          <span>{value}</span>
                          <span className="text-xs text-slate-400 font-normal">
                            {description}
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </DialogTitle>
            {transaction?.id ? (
              <div className="flex flex-row gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-slate-700 text-slate-300"
                  onClick={handleDuplicate}
                  title="Duplicate transaction"
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-red-900/60 text-red-400"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete transaction"
                >
                  <Trash2 className="size-4" />
                </Button>
                <DialogClose asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:bg-slate-700 text-slate-400"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </div>
            ) : (
              <DialogClose asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-slate-700 text-slate-400"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            )}
          </DialogHeader>
          <TransactionForm
            transaction={transaction}
            onSubmit={onSubmit}
            formType={formType as FormType}
          />
          {onPlannedSubmit && (
            <>
              <Separator className="bg-slate-700" />
              <Button
                className="w-full bg-yellow-700 hover:bg-yellow-600 text-white mb-2"
                onClick={async () => {
                  setIsModalOpen(false);
                  await onPlannedSubmit();
                }}
                type="button"
              >
                Waive — skip this occurrence
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

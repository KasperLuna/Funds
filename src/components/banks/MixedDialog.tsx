import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ChevronDown, EllipsisVertical, X } from "lucide-react";
import { FormType, Transaction } from "@/lib/types";
import { pb } from "@/lib/pocketbase/pocketbase";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PopoverArrow } from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import React, { useCallback, useMemo, useState } from "react";
import { Decimal } from "decimal.js";
import { usePlannedTransactions } from "@/hooks/usePlannedTransactions";
import { useBanksQuery } from "@/lib/hooks/useBanksQuery";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import useMediaQuery from "@/lib/hooks/useMediaQuery";
import dynamic from "next/dynamic";

// Dynamic imports for form components — only loaded when needed
const TransactionForm = dynamic(
  () =>
    import("./transactions/TransactionForm").then((m) => ({
      default: m.TransactionForm,
    })),
  { loading: () => <FormLoader /> },
);
const BankForm = dynamic(
  () => import("./BankForm").then((m) => ({ default: m.BankForm })),
  { loading: () => <FormLoader /> },
);
const CategoryForm = dynamic(
  () => import("../CategoryForm").then((m) => ({ default: m.CategoryForm })),
  { loading: () => <FormLoader /> },
);
const PlannedTransactionForm = dynamic(
  () =>
    import("./PlannedTransactionForm").then((m) => ({
      default: m.PlannedTransactionForm,
    })),
  { loading: () => <FormLoader /> },
);
const TransactionTemplateForm = dynamic(
  () =>
    import("./TransactionTemplateForm").then((m) => ({
      default: m.TransactionTemplateForm,
    })),
  { loading: () => <FormLoader /> },
);

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
          <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
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

  // Use media query to determine if we're on mobile
  const isActuallyMobile = useMediaQuery("(max-width: 768px)");

  // Only render the dialog if:
  // 1. This is for a transaction (editing existing)
  // 2. This is for creating new AND the isMobile prop matches the actual screen size
  const shouldRenderDialog = transaction || isMobile === isActuallyMobile;

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
  const formType = queryParams["create"] ?? "Transaction";
  const setFormType = useCallback(
    (value: string) => setQueryParams({ create: value }),
    [setQueryParams],
  );
  const { addPlannedTransaction } = usePlannedTransactions();
  const { user } = useAuth();
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
      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
        <AlertDialogContent
          className="bg-slate-900 text-white border-2 border-slate-800 px-4 py-1 rounded-md"
          style={{ overscrollBehavior: "contain" }}
        >
          <AlertDialogDescription className="sr-only">
            {transaction?.id
              ? "Edit an existing transaction"
              : "Create a new item"}
          </AlertDialogDescription>
          <AlertDialogHeader className="flex flex-row w-full justify-between">
            <AlertDialogTitle className="self-center">
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
                      {["Transaction", "Transfer", "Difference"].map((type) => (
                        <DropdownMenuRadioItem
                          key={type}
                          value={type}
                          className="hover:bg-slate-600"
                        >
                          {type}
                        </DropdownMenuRadioItem>
                      ))}
                      <DropdownMenuSeparator className="mx-2" />
                      {[
                        "Bank",
                        "Category",
                        "PlannedTransaction",
                        "Template",
                      ].map((type) => (
                        <DropdownMenuRadioItem
                          key={type}
                          value={type}
                          className="hover:bg-slate-600"
                        >
                          {type}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </AlertDialogTitle>
            <div className="flex flex-row gap-1">
              {transaction?.id && (
                <AlertDialogAction asChild className="bg-red-700 w-[40px]">
                  <Popover>
                    <PopoverTrigger asChild className="mt-2 sm:mt-0">
                      <Button className="w-[40px] hover:bg-slate-700">
                        <EllipsisVertical className="shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="center"
                      className="p-1 w-fit bg-slate-800 border-0 flex flex-col gap-2 z-50"
                    >
                      <PopoverArrow className="fill-slate-800" />
                      <Button
                        className="hover:bg-slate-700 bg-slate-800"
                        onClick={handleDuplicate}
                      >
                        Duplicate
                      </Button>
                      <Button
                        className="hover:bg-red-500 bg-red-700"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Delete
                      </Button>
                    </PopoverContent>
                  </Popover>
                </AlertDialogAction>
              )}
              {onPlannedSubmit && (
                <Button
                  className="w-fit bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-2 ml-1 mt-2 sm:mt-0"
                  onClick={async () => {
                    setIsModalOpen(false);
                    await onPlannedSubmit();
                  }}
                  type="button"
                >
                  Waive
                </Button>
              )}
              <AlertDialogCancel className="w-fit bg-transparent p-2 border-slate-700 hover:bg-slate-400">
                <X />
              </AlertDialogCancel>
            </div>
          </AlertDialogHeader>
          {["Transaction", "Transfer", "Difference"].includes(formType) && (
            <TransactionForm
              transaction={transaction}
              onSubmit={onSubmit}
              formType={formType as FormType}
            />
          )}
          {formType === "Bank" && <BankForm />}
          {formType === "Category" && <CategoryForm />}
          {formType === "PlannedTransaction" && (
            <PlannedTransactionForm
              onSubmit={async (pt) => {
                if (!user?.id) {
                  alert(
                    "You must be logged in to create a planned transaction.",
                  );
                  return;
                }
                const mappedCategories =
                  pt.categories.map(
                    (categ) =>
                      categoryData?.categories.find((cat) => cat.name === categ)
                        ?.id || categ,
                  ) || [];
                await addPlannedTransaction({
                  ...pt,
                  user: user.id,
                  amount: ["expense", "withdrawal"].includes(pt.type)
                    ? new Decimal(pt.amount).negated().toNumber()
                    : new Decimal(pt.amount).toNumber(),
                  categories: mappedCategories,
                });
                setIsModalOpen(false);
              }}
            />
          )}
          {formType === "Template" && (
            <TransactionTemplateForm
              onSubmit={async (t) => {
                if (!user?.id) {
                  alert("You must be logged in to create a template.");
                  return;
                }
                const mappedCategories =
                  t.categories.map(
                    (categ) =>
                      categoryData?.categories.find((cat) => cat.name === categ)
                        ?.id || categ,
                  ) || [];
                await addPlannedTransaction({
                  ...t,
                  user: user.id,
                  isTemplate: true,
                  amount: ["expense", "withdrawal"].includes(t.type)
                    ? new Decimal(t.amount).abs().negated().toNumber()
                    : new Decimal(t.amount).abs().toNumber(),
                  categories: mappedCategories,
                });
                setIsModalOpen(false);
              }}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

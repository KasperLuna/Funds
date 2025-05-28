import { TransactionForm } from "./transactions/TransactionForm";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
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
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BankForm } from "./BankForm";
import { CategoryForm } from "../CategoryForm";
import { PlannedTransactionForm } from "./PlannedTransactionForm";
import { usePlannedTransactions } from "@/store/PlannedTransactionsContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import React, { useCallback, useMemo, useState } from "react";
import { Decimal } from "decimal.js";

export const MixedDialogTrigger = ({
  children,
  transaction,
}: {
  children: React.ReactNode;
  transaction?: Transaction;
}) => {
  const { queryParams, setQueryParams } = useQueryParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isCreateModalOpen = !!queryParams["create"];
  const setIsCreateModalOpen = useCallback(
    (value: boolean) => {
      setQueryParams({ create: value ? "Transaction" : undefined });
    },
    [setQueryParams]
  );

  return (
    <MixedDialog
      isModalOpen={transaction ? isEditModalOpen : isCreateModalOpen}
      setIsModalOpen={transaction ? setIsEditModalOpen : setIsCreateModalOpen}
      trigger={children}
      transaction={transaction}
    />
  );
};

export const MixedDialog = ({
  trigger,
  isModalOpen,
  setIsModalOpen,
  transaction,
}: {
  trigger?: React.ReactNode;
  isModalOpen: boolean;
  setIsModalOpen: (value: boolean) => void;
  transaction?: Transaction;
}) => {
  const { queryParams, setQueryParams } = useQueryParams();
  const { bankData, categoryData } = useBanksCategsContext();
  const queryClient = useQueryClient();
  const formType = queryParams["create"] ?? "Transaction";
  const setFormType = useCallback(
    (value: string) => setQueryParams({ create: value }),
    [setQueryParams]
  );
  const { addPlannedTransaction } = usePlannedTransactions();
  const { user } = useAuth();

  // Memoize bank lookups for performance
  const originalBank = useMemo(
    () => bankData?.banks.find((bank) => bank.id === transaction?.bank),
    [bankData, transaction]
  );

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
                    ?.id || ""
              ) || [],
            amount: ["expense", "withdrawal"].includes(data.type)
              ? new Decimal(data.amount).negated().toNumber()
              : new Decimal(data.amount).toNumber(),
          };
          const transactionBank = bankData?.banks.find(
            (bank) => bank.id === parsedData.bank
          );
          if (!transactionBank?.id || !parsedData)
            throw new Error("Error updating bank balance");
          if (data.id) {
            // Update existing transaction
            batcher.collection("transactions").update(data.id, parsedData);
            // Find the original transaction and bank
            const original = transaction;
            const originalBank = bankData?.banks.find(
              (bank) => bank.id === original?.bank
            );
            if (!original || !originalBank)
              throw new Error("Original transaction/bank not found");
            if (originalBank.id === transactionBank.id) {
              // Same bank: subtract old amount, add new amount
              batcher.collection("banks").update(transactionBank.id, {
                balance: new Decimal(transactionBank.balance)
                  .sub(new Decimal(original.amount))
                  .add(new Decimal(parsedData.amount))
                  .toNumber(),
              });
            } else {
              // Bank changed: subtract from old, add to new
              batcher.collection("banks").update(originalBank.id, {
                balance: new Decimal(originalBank.balance)
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
            // Create new transaction
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
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["bankTrends"] });
        queryClient.invalidateQueries({ queryKey: ["transactionsOfMonth"] });
      } catch (error) {
        alert(error);
      }
    },
    [categoryData, setIsModalOpen, bankData, queryClient]
  );

  // Memoize dialog actions
  const handleDuplicate = useCallback(() => {
    if (!transaction) return;
    setIsModalOpen(false);
    const { id, ...rest } = transaction;
    // Inline updateBankBalanceOnTransaction logic for batching
    const transactionBank = bankData?.banks.find(
      (bank) => bank.id === rest.bank
    );
    const batch = pb.createBatch();
    if (!transactionBank?.id || !rest)
      throw new Error("Error updating bank balance");
    // Add transaction creation to batch
    batch.collection("transactions").create(rest);
    // Add bank balance update to batch
    batch.collection("banks").update(transactionBank.id, {
      balance: new Decimal(transactionBank.balance)
        .add(new Decimal(rest.amount))
        .toNumber(),
    });
    batch.send().then(() => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bankTrends"] });
      queryClient.invalidateQueries({ queryKey: ["transactionsOfMonth"] });
    });
  }, [transaction, setIsModalOpen, bankData, queryClient]);

  const handleDelete = useCallback(() => {
    if (!transaction) return;
    setIsModalOpen(false);
    const batch = pb.createBatch();
    // Add transaction deletion to batch
    batch.collection("transactions").delete(transaction.id as string);
    // Inline updateBankBalanceOnTransaction logic for batching
    if (!originalBank?.id || !transaction)
      throw new Error("Error updating bank balance");
    batch.collection("banks").update(originalBank.id, {
      balance: new Decimal(originalBank.balance)
        .sub(new Decimal(transaction.amount))
        .toNumber(),
    });
    batch.send().then(() => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bankTrends"] });
      queryClient.invalidateQueries({ queryKey: ["transactionsOfMonth"] });
    });
  }, [transaction, setIsModalOpen, originalBank, queryClient]);

  return (
    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent
        className="bg-slate-900 text-white border-2 border-slate-800 px-4 py-1 rounded-md"
        aria-describedby={undefined}
      >
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
                    {["Bank", "Category", "PlannedTransaction"].map((type) => (
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
                      onClick={handleDelete}
                    >
                      Delete
                    </Button>
                  </PopoverContent>
                </Popover>
              </AlertDialogAction>
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
                alert("You must be logged in to create a planned transaction.");
                return;
              }
              const mappedCategories =
                pt.categories.map(
                  (categ) =>
                    categoryData?.categories.find((cat) => cat.name === categ)
                      ?.id || categ
                ) || [];
              await addPlannedTransaction({
                ...pt,
                user: user.id,
                categories: mappedCategories,
              });
              setIsModalOpen(false);
            }}
            onCancel={() => setIsModalOpen(false)}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

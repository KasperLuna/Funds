import { TransactionForm } from "./TransactionForm";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { EllipsisVertical, X } from "lucide-react";
import { Transaction } from "@/lib/types";
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

export function TransactionDialog({
  trigger,
  isModalOpen,
  setIsModalOpen,
  transaction,
}: {
  trigger?: React.ReactNode;
  isModalOpen: boolean;
  setIsModalOpen: (value: boolean) => void;
  transaction?: Transaction;
}) {
  const { bankData, categoryData } = useBanksCategsContext();
  const queryClient = useQueryClient();

  const updateBankBalanceOnTransaction = async ({
    action,
    newTransaction,
  }: {
    action: string;
    newTransaction?: Omit<Transaction, "date"> & {
      date: Date;
    };
  }) => {
    const originalBank = bankData?.banks.find(
      (bank) => bank.id === transaction?.bank
    );
    const transactionBank = bankData?.banks.find(
      (bank) => bank.id === newTransaction?.bank
    );

    try {
      if (action === "delete") {
        if (!originalBank?.id || !transaction) {
          throw new Error("Error updating bank balance");
        }
        await pb.collection("banks").update(originalBank?.id, {
          balance: originalBank.balance - transaction.amount,
        });
        return;
      }

      if (action === "create") {
        if (!transactionBank?.id || !newTransaction) {
          throw new Error("Error updating bank balance");
        }
        await pb.collection("banks").update(transactionBank?.id, {
          balance: transactionBank?.balance + newTransaction.amount,
        });
        return;
      }

      if (action === "update") {
        if (
          !originalBank?.id ||
          !transactionBank?.id ||
          !transaction ||
          !newTransaction
        ) {
          throw new Error("Error updating bank balance");
        }

        if (originalBank.id === transactionBank.id) {
          await pb.collection("banks").update(originalBank.id, {
            balance:
              originalBank.balance - transaction.amount + newTransaction.amount,
          });
          return;
        }

        await pb.collection("banks").update(originalBank.id, {
          balance: originalBank.balance - transaction.amount,
        });

        await pb.collection("banks").update(transactionBank.id, {
          balance: transactionBank.balance + newTransaction.amount,
        });
      }
    } catch (error) {
      console.error(
        error,
        "new transaction",
        newTransaction,
        "old transaction",
        transaction
      );
    } finally {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    }
  };
  const onSubmit = async (
    data: Omit<Transaction, "date"> & {
      date: Date;
    }
  ) => {
    const parsedData = {
      ...data,
      // have to do this because multi-select for category doesnt allow object-based values
      categories:
        data.categories.map((categ) => {
          return (
            categoryData?.categories.find((cat) => cat.name === categ)?.id || ""
          );
        }) || [],
      amount: ["expense", "withdrawal"].includes(data.type)
        ? -data.amount
        : data.amount,
    };

    setIsModalOpen(false);

    if (transaction?.id) {
      pb.collection("transactions").update(transaction.id, parsedData);
    } else {
      pb.collection("transactions").create(parsedData);
    }
    updateBankBalanceOnTransaction({
      action: transaction?.id ? "update" : "create",
      newTransaction: parsedData,
    });
  };

  return (
    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent
        className="bg-slate-900 text-white border-2 border-slate-800 px-4 py-1 rounded-md"
        aria-describedby={undefined}
      >
        <AlertDialogHeader className="flex flex-row w-full justify-between">
          <AlertDialogTitle className="self-center">
            {transaction?.id ? "Edit" : "Add"} Transaction
          </AlertDialogTitle>
          <div className="flex flex-row gap-1">
            {transaction?.id && (
              <AlertDialogAction asChild className="bg-red-700 w-[40px]">
                <Popover>
                  <PopoverTrigger
                    asChild
                    // not sure why this has to be here, but it works
                    className="mt-2 sm:mt-0"
                  >
                    <Button className="w-[40px] hover:bg-slate-700">
                      <EllipsisVertical className="shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="center"
                    className="p-1 w-fit bg-slate-800 border-0 flex flex-col gap-2 z-[2000]"
                  >
                    <PopoverArrow className="fill-slate-800" />
                    <Button
                      className="hover:bg-slate-700 bg-slate-800"
                      onClick={() => {
                        setIsModalOpen(false);
                        const { id, ...rest } = transaction;
                        pb.collection("transactions").create(rest);
                        updateBankBalanceOnTransaction({
                          action: "create",
                          newTransaction: {
                            ...rest,
                            date: new Date(rest.date),
                          },
                        });
                      }}
                    >
                      Duplicate
                    </Button>
                    <Button
                      className="hover:bg-red-500 bg-red-700"
                      onClick={() => {
                        setIsModalOpen(false);
                        pb.collection("transactions").delete(
                          transaction?.id as string
                        );

                        updateBankBalanceOnTransaction({
                          action: "delete",
                        });
                      }}
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
        <TransactionForm transaction={transaction} onSubmit={onSubmit} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

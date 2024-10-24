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
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useState } from "react";
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
  const setIsCreateModalOpen = (value: boolean) => {
    setQueryParams({ create: value ? "Transaction" : undefined });
  };

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
  const setFormType = (value: string) => {
    setQueryParams({ create: value });
  };

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
          balance: new Decimal(originalBank.balance)
            .sub(new Decimal(transaction.amount))
            .toNumber(),
        });
        return;
      }

      if (action === "create") {
        if (!transactionBank?.id || !newTransaction) {
          throw new Error("Error updating bank balance");
        }
        await pb.collection("banks").update(transactionBank?.id, {
          balance: new Decimal(transactionBank?.balance)
            .add(new Decimal(newTransaction.amount))
            .toNumber(),
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
            balance: new Decimal(originalBank.balance)
              .sub(new Decimal(transaction.amount))
              .add(new Decimal(newTransaction.amount))
              .toNumber(),
          });
          return;
        }

        await pb.collection("banks").update(originalBank.id, {
          balance: new Decimal(originalBank.balance)
            .sub(new Decimal(transaction.amount))
            .toNumber(),
        });

        await pb.collection("banks").update(transactionBank.id, {
          balance: new Decimal(transactionBank.balance)
            .add(new Decimal(newTransaction.amount))
            .toNumber(),
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
      queryClient.invalidateQueries({ queryKey: ["bankTrends"] });
    }
  };
  const onSubmit = async (
    data: Omit<Transaction, "date"> & {
      date: Date;
    }
  ) => {
    try {
      const parsedData = {
        ...data,
        // have to do this because multi-select for category doesnt allow object-based values
        categories:
          data.categories.map((categ) => {
            return (
              categoryData?.categories.find((cat) => cat.name === categ)?.id ||
              ""
            );
          }) || [],
        amount: ["expense", "withdrawal"].includes(data.type)
          ? new Decimal(data.amount).negated().toNumber()
          : new Decimal(data.amount).toNumber(),
      };

      setIsModalOpen(false);

      if (transaction?.id) {
        await pb.collection("transactions").update(transaction.id, parsedData);
      } else {
        await pb
          .collection("transactions")
          .create(parsedData, { requestKey: null });
      }
      await updateBankBalanceOnTransaction({
        action: transaction?.id ? "update" : "create",
        newTransaction: parsedData,
      });
    } catch (error) {
      alert(error);
    }
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
            {transaction?.id ? "Edit" : "Create"}{" "}
            {transaction?.id ? (
              "Transaction"
            ) : (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={"outline"}
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
                    {["Bank", "Category"].map((type) => (
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
                    className="p-1 w-fit bg-slate-800 border-0 flex flex-col gap-2 z-50"
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
        {["Transaction", "Transfer", "Difference"].includes(formType) && (
          <TransactionForm
            transaction={transaction}
            onSubmit={onSubmit}
            formType={formType as FormType}
          />
        )}
        {formType === "Bank" && <BankForm />}
        {formType === "Category" && <CategoryForm />}
      </AlertDialogContent>
    </AlertDialog>
  );
};

import PocketBase, { AsyncAuthStore } from "pocketbase";
import { Bank, Category, FirebaseTxTypes, Transaction } from "../types";
import { getCookie, setCookie } from "../utils";

const store = new AsyncAuthStore({
  save: async (serialized) => setCookie("pb_auth", serialized, 720),
  initial:
    typeof window !== "undefined" ? getCookie("pb_auth") ?? "" : undefined,
});

export const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "",
  store
);

export const addBank = async (bank: any) => {
  const id = pb.authStore.model?.id;
  await pb.collection("banks").create<any>(
    {
      ...bank,
      name: bank.name,
      balance: bank.balance,
      user: id,
    },
    { requestKey: null }
  );
};

export const addCategory = async (category: any) => {
  const id = pb.authStore.model?.id;
  await pb.collection("categories").create<any>(
    {
      ...category,
      name: category.name,
      user: id,
    },
    { requestKey: null }
  );
};

export const addTransaction = async (transaction: any) => {
  const id = pb.authStore.model?.id;
  await pb.collection("transactions").create<any>(
    {
      user: id,
      amount: transaction.amount,
      bank: transaction.bank,
      description: transaction.description,
      categories: transaction.categories,
      date: new Date(transaction.date.value._seconds * 1000),
      type: transaction.type,
    },
    {
      requestKey: null,
    }
  );
};

export const recomputeBalance = async (bank: string) => {
  const id = pb.authStore.model?.id;

  const bankId = (
    await pb.collection("banks").getFullList<Bank>({ filter: `name="${bank}"` })
  )[0].id;

  // query all transactions for this bank
  const transactions = await pb
    .collection("transactions")
    .getFullList<Transaction>({
      filter: `bank="${bankId}"`,
      sort: "-date",
    });

  const balance = transactions
    .filter((txn) => txn.user === id)
    .reduce((acc, curr) => acc + curr.amount, 0);

  // query bank by name
  const bankData = await pb
    .collection("banks")
    .getFullList<Bank>({ filter: `name="${bank}"` });

  // update bank balance
  pb.collection("banks").update(
    bankData[0].id!,
    {
      balance: transactions
        .filter((txn) => txn.user === id)
        .reduce((acc, curr) => acc + curr.amount, 0),
    },
    { requestKey: null }
  );
};

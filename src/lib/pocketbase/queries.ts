import { Bank, Category, ExpandedTransaction, Transaction } from "../types";
import { pb } from "./pocketbase";

export const paginatedFetchTransactions = async ({
  pageParam = 1,
  bankName,
  query,
  categories,
  month,
}: {
  pageParam?: number;
  bankName: string | null;
  query: string | null;
  categories?: string[] | null;
  month?: string | null;
}) => {
  const bank = bankName
    ? await pb.collection("banks").getFirstListItem<Bank>(`name="${bankName}"`)
    : undefined;

  let filter: string[] = [];

  if (bankName) {
    filter.push(`bank="${bank?.id}"`);
  }

  if (month) {
    filter.push(`date<"${month}"`);
  }

  if (categories) {
    let categoryFilter: string[] = [];
    categories.forEach((category) => {
      categoryFilter.push(`categories~"${category}"`);
    });
    filter.push(`(${categoryFilter.join("||")})`);
  }

  if (query) {
    filter.push(`description~"${query}"||amount~"${query}"`);
  }

  const response = await pb
    .collection<ExpandedTransaction>("transactions")
    .getList(pageParam, 20, {
      sort: "-date",
      expand: "bank,categories",
      ...(filter && { filter: filter.join("&&") }),
    });
  return response;
};

export const addBank = async (bank: Partial<Bank>) => {
  const id = pb.authStore.model?.id;
  await pb.collection("banks").create<Bank>(
    {
      ...bank,
      name: bank.name,
      balance: bank.balance,
      user: id,
    },
    { requestKey: null }
  );
};

export const addCategory = async (category: Partial<Category>) => {
  const id = pb.authStore.model?.id;
  await pb.collection("categories").create<Category>(
    {
      ...category,
      name: category.name,
      hideable: category.hideable,
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

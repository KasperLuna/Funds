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

export const fetchStats = async () => {
  const records = await pb.collection("transactions_stats").getFullList({
    sort: "-year, -month",
  });
  return records;
};

//#region For Importing with JSON Export
export const addCategories = async (categories: any) => {
  const id = pb.authStore.model?.id;

  for (const category in categories) {
    await pb.collection("categories").create<Category>(
      {
        name: category,
        hideable: categories[category as keyof typeof categories]?.hideable,
        user: id,
      },
      { requestKey: null }
    );
  }
};

export const addTransactions = async (
  banks?: Bank[],
  categories?: Category[],
  transactions?: any
) => {
  const id = pb.authStore.model?.id;
  for (const transaction in transactions) {
    const bank = banks?.find(
      (bank) => bank.name === transactions[transaction].bank
    )?.id;
    const transactionCategories = categories
      ?.filter((category) =>
        transactions[transaction].category.includes(category.name)
      )
      .map((category) => category.id);

    console.log(bank, transactionCategories);
    await pb.collection("transactions").create<Transaction>(
      {
        user: id,
        amount: transactions[transaction].amount,
        bank: bank,
        description: transactions[transaction].description,
        categories: transactionCategories,
        date: new Date(transactions[transaction].date.value._seconds * 1000),
        type: transactions[transaction].type,
      },
      { requestKey: null }
    );
  }
};
//#endregion

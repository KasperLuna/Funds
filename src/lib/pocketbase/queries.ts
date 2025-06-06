import {
  Bank,
  Category,
  ExpandedTransaction,
  Token,
  Transaction,
  Trend,
  User,
} from "../types";
import { pb } from "./pocketbase";
import { Decimal } from "decimal.js";
import dayjs from "dayjs";

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

export const getTransactionsOfAMonth = async (date: string) => {
  const startOfMonth = dayjs(date)
    .startOf("month")
    .subtract(1, "day")
    .toISOString();
  const endOfMonth = dayjs(date).endOf("month").add(1, "day").toISOString();

  const response = await pb
    .collection<Transaction>("transactions")
    .getFullList<Transaction>({
      filter: `date>="${startOfMonth}"&&date<="${endOfMonth}"`,
      sort: "-date",
    });

  // dates are stored in UTC so we need to filter
  // for current month
  const currentMonthTransactions = response.filter(
    (transaction) =>
      dayjs(transaction.date).get("month") === dayjs(date).get("month")
  );

  return currentMonthTransactions;
};

export const addBank = async (bank: Partial<Bank>) => {
  const id = pb.authStore.record?.id;
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
  const id = pb.authStore.record?.id;
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

export const recomputeBalanceById = async (bankId: string) => {
  const id = pb.authStore.record?.id;

  // query all transactions for this bank
  const transactions = await pb
    .collection("transactions")
    .getFullList<Transaction>({
      filter: `bank="${bankId}"`,
      sort: "-date",
    });

  // update bank balance
  const correctedBalance = transactions
    .filter((txn) => txn.user === id)
    .reduce((acc, curr) => {
      const sum = acc.add(curr.amount);
      return sum.modulo(1).abs().lt(1e-12) ? sum.floor() : sum;
    }, new Decimal(0));

  pb.collection("banks").update(
    bankId,
    {
      balance: correctedBalance.toNumber(),
    },
    { requestKey: null }
  );
};

export const fetchBanksTrends = async () => {
  const records = await pb
    .collection("transactions_trends")
    .getFullList<Trend>({
      sort: "-year, -month",
    });
  return records;
};

export const deleteCategoryById = async (categoryId: string) => {
  // fetch all transactions that have this category
  const transactions = await pb
    .collection("transactions")
    .getFullList<Transaction>({
      filter: `categories~"${categoryId}"`,
    });

  // remove the category from each transaction in parallel
  await Promise.all(
    transactions.map((transaction) =>
      transaction.id
        ? pb.collection("transactions").update(
            transaction.id,
            {
              categories: transaction.categories.filter(
                (c) => c !== categoryId
              ),
            },
            { requestKey: null }
          )
        : Promise.resolve()
    )
  );

  await pb.collection("categories").delete(categoryId);
};

//This query will only ever return an array of one json, the currently logged in user.
export const userQuery = async () => {
  const userData = await pb.collection("users").getFullList<User>(undefined, {
    requestKey: null,
  });
  return userData?.[0];
};

export const updateUser = async (data: FormData) => {
  const id = pb.authStore.record?.id;
  if (!id) throw new Error("User not authenticated");
  await pb.collection("users").update(id, data, { requestKey: null });
};

//#region For Importing with JSON Export
export const addCategories = async (categories: {
  [key: string]: {
    hideable: boolean;
  };
}) => {
  const id = pb.authStore.record?.id;
  const batch = pb.createBatch();
  Object.entries(categories).forEach(([category, value]) => {
    batch.collection("categories").create(
      {
        name: category,
        hideable: value.hideable,
        user: id,
      },
      { requestKey: null }
    );
  });
  await batch.send();
};

export const addBanks = async (banks: {
  [key: string]: {
    balance: number;
  };
}) => {
  const id = pb.authStore.record?.id;
  const batch = pb.createBatch();
  Object.entries(banks).forEach(([bank, value]) => {
    batch.collection("banks").create(
      {
        name: bank,
        balance: new Decimal(value.balance).toNumber(),
        user: id,
      },
      { requestKey: null }
    );
  });
  await batch.send();
};

export const addTransactions = async (
  banks?: Bank[],
  categories?: Category[],
  transactions?: {
    [key: string]: {
      amount: number;
      bank: string;
      description: string;
      category: string[];
      date: { value: { _seconds: number } };
      type: "income" | "expense";
    };
  }
) => {
  const id = pb.authStore.record?.id;
  if (!transactions) return;
  const batch = pb.createBatch();
  Object.entries(transactions).forEach(([_, txn]) => {
    const bank = banks?.find((b) => b.name === txn.bank)?.id;
    const transactionCategories = categories
      ?.filter((category) => txn.category.includes(category.name))
      .map((category) => category.id);
    batch.collection("transactions").create(
      {
        user: id,
        amount: new Decimal(txn.amount).toNumber(),
        bank: bank,
        description: txn.description,
        categories: transactionCategories,
        date: new Date(txn.date.value._seconds * 1000),
        type: txn.type,
      },
      { requestKey: null }
    );
  });
  await batch.send();
};
//#endregion
export const updateCategoryById = async (
  categoryId: string,
  updates: Partial<Category>
) => {
  await pb.collection("categories").update(categoryId, updates);
};

export const renameBankById = async (bankId: string, name: string) => {
  await pb.collection("banks").update(bankId, { name });
};

export const deleteBankById = async (bankId: string) => {
  await pb.collection("banks").delete(bankId);
};

// Token-related operations
export const addToken = async (token: Partial<Token>) => {
  const id = pb.authStore.record?.id;
  await pb.collection("tokens").create<Token>(
    {
      ...token,
      user: id,
    },
    { requestKey: null }
  );
};

export const updateTokenById = async (
  tokenId: string,
  updates: Partial<Token>
) => {
  await pb.collection("tokens").update(tokenId, updates);
};

export const deleteTokenById = async (tokenId: string) => {
  await pb.collection("tokens").delete(tokenId);
};

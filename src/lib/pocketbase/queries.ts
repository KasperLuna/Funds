import { Bank, ExpandedTransaction } from "../types";
import { pb } from "./pocketbase";

export const paginatedFetchTransactions = async ({
  pageParam = 1,
  bankName,
  query,
}: {
  pageParam?: number;
  bankName?: string;
  query: string | null;
}) => {
  const bank = bankName
    ? await pb.collection("banks").getFirstListItem<Bank>(`name="${bankName}"`)
    : undefined;

  let filter = "";

  if (bankName) {
    filter = `bank="${bank?.id}"`;
  }

  if (query) {
    filter += `${bankName ? "&&" : ""}description~"${query}"||amount~"${query}"||categories~"${query}"`;
  }

  const response = await pb
    .collection<ExpandedTransaction>("transactions")
    .getList(pageParam, 20, {
      sort: "-date",
      expand: "bank,categories",
      ...(filter && { filter: filter }),
    });
  return response;
};

import { Bank, ExpandedTransaction } from "../types";
import { pb } from "./pocketbase";

export const paginatedFetchTransactions = async ({
  pageParam = 1,
  bankName,
}: {
  pageParam?: number;
  bankName?: string;
}) => {
  const bank = bankName
    ? await pb.collection("banks").getFirstListItem<Bank>(`name="${bankName}"`)
    : undefined;

  const response = await pb
    .collection<ExpandedTransaction>("transactions")
    .getList(pageParam, 20, {
      sort: "-date",
      expand: "bank,categories",
      ...(bankName && { filter: `bank="${bank?.id}"` }),
    });
  return response;
};

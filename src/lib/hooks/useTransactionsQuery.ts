import { useInfiniteQuery } from "@tanstack/react-query";
import { paginatedFetchTransactions } from "../pocketbase/queries";
import { pb } from "../pocketbase/pocketbase";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBanksCategsContext } from "./useBanksCategsContext";

export const useTransactionsQuery = ({ bankName }: { bankName?: string }) => {
  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const { categoryData } = useBanksCategsContext();
  const categories = searchParams.get("categories")?.split(",");
  const categoryIds = categories?.map(
    (category) =>
      categoryData?.categories.find((categ) => categ.name === category)?.id
  );

  const month = searchParams.get("month");

  const {
    data,
    error,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["transactions", bankName, query, categories, month],
    queryFn: ({ pageParam = 1 }) =>
      paginatedFetchTransactions({
        pageParam,
        bankName,
        query,
        categories: categoryIds as string[],
        month,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined;
    },
  });

  useEffect(() => {
    pb.collection("transactions")
      .subscribe("*", () => refetch())
      .catch(() => {
        alert("Error subscribing to transactions, close the app and try again");
      });
    return () => {
      pb.collection("transactions").unsubscribe("*");
    };
  }, [bankName, fetchNextPage, refetch]);

  return {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};

import { useInfiniteQuery } from "@tanstack/react-query";
import { paginatedFetchTransactions } from "../pocketbase/queries";
import { pb } from "../pocketbase/pocketbase";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBanksCategsContext } from "./useBanksCategsContext";
import { useQueryParams } from "./useQueryParams";

export const useTransactionsQuery = () => {
  const { queryParams } = useQueryParams();
  const bankName = queryParams["bank"]; //searchParams.get("bank");
  const query = queryParams["query"]; //searchParams.get("query");

  const { categoryData } = useBanksCategsContext();
  const categories = queryParams["categories"]?.split(","); //searchParams.get("categories")?.split(",");
  const categoryIds = categories?.map(
    (category: string) =>
      categoryData?.categories.find((categ) => categ.name === category)?.id
  );

  const month = queryParams["month"]; //searchParams.get("month");

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
    let retries = 0;
    const maxRetries = 3;
    const retryDelay = 300; // 2 seconds

    const subscribeWithRetry = (): void => {
      pb.collection("transactions")
        .subscribe("*", () => refetch())
        .catch(() => {
          if (retries < maxRetries) {
            retries += 1;
            setTimeout(subscribeWithRetry, retryDelay); // Retry after delay
          } else {
            alert(
              "Max retries reached for transaction subscription. Refresh the tab or close the app."
            );
          }
        });
    };

    subscribeWithRetry();

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

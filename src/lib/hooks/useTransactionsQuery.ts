import { useInfiniteQuery } from "@tanstack/react-query";
import { paginatedFetchTransactions } from "../pocketbase/queries";
import { pb } from "../pocketbase/pocketbase";
import { useEffect } from "react";
import { useQueryParams } from "./useQueryParams";
import { useCategoriesQuery } from "./useCategoriesQuery";
import { useToast } from "@/components/ui/toast";

export const useTransactionsQuery = () => {
  const { queryParams } = useQueryParams();
  const { addToast } = useToast();
  const bankName = queryParams["bank"]; //searchParams.get("bank");
  const query = queryParams["query"]; //searchParams.get("query");

  const categoryData = useCategoriesQuery();
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
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["transactions", bankName, query, categories, month],
    queryFn: ({ pageParam = 1 }) =>
      paginatedFetchTransactions({
        pageParam,
        bankName: bankName ?? null,
        query: query ?? null,
        categories: categoryIds as string[],
        month: month ?? null,
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
            addToast({
              type: "error",
              title: "Live sync unavailable",
              description:
                "Couldn't subscribe to transaction updates. Changes will still show on refresh.",
            });
          }
        });
    };

    subscribeWithRetry();

    return () => {
      pb.collection("transactions").unsubscribe("*");
    };
  }, [bankName, fetchNextPage, refetch, addToast]);

  return {
    data,
    error,
    refetch,
    isLoading,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};

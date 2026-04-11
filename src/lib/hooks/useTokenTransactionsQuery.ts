import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../pocketbase/pocketbase";
import { TokenTransaction } from "../types";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export const useTokenTransactionsQuery = (tokenId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: transactions = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<TokenTransaction[]>({
    queryKey: ["tokenTransactions", tokenId],
    queryFn: async () => {
      if (!tokenId) return [];
      const result = await pb
        .collection("token_transactions")
        .getFullList<TokenTransaction>({
          filter: `token="${tokenId}"`,
          sort: "-date",
        });
      return result;
    },
    enabled: !!user && !!tokenId,
  });

  const loading = isLoading || isRefetching;

  useEffect(() => {
    if (!user || !tokenId) return;

    const handleRealtimeUpdate = (data: {
      action: string;
      record: TokenTransaction;
    }) => {
      queryClient.setQueryData<TokenTransaction[]>(
        ["tokenTransactions", tokenId],
        (prev) => {
          if (!prev) return [];
          switch (data.action) {
            case "create":
              return [data.record, ...prev];
            case "update":
              return prev.map((t) =>
                t.id === data.record.id ? data.record : t
              );
            case "delete":
              return prev.filter((t) => t.id !== data.record.id);
            default:
              return prev;
          }
        }
      );
    };

    pb.collection("token_transactions")
      .subscribe("*", handleRealtimeUpdate)
      .catch(() => {});

    return () => {
      pb.collection("token_transactions").unsubscribe("*");
    };
  }, [user, tokenId, queryClient]);

  return { transactions, loading, refetch };
};

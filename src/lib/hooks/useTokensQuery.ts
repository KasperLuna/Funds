import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../pocketbase/pocketbase";
import { Token } from "../types";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export const useTokensQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchTokens = async () => {
    const result = await pb.collection("tokens").getFullList<Token>({
      sort: "-total",
    });
    return result;
  };

  const {
    data: tokens = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Token[]>({
    queryKey: ["tokens", user?.id],
    queryFn: fetchTokens,
    enabled: !!user,
  });

  const loading = isLoading || isRefetching;

  useEffect(() => {
    if (!user) return;

    const handleRealtimeUpdate = (data: { action: string; record: Token }) => {
      queryClient.setQueryData<Token[]>(["tokens", user.id], (prevTokens) => {
        if (!prevTokens) return [];

        switch (data.action) {
          case "create":
            return [data.record, ...prevTokens];
          case "update":
            return prevTokens.map((token) =>
              token.id === data.record.id ? data.record : token
            );
          case "delete":
            return prevTokens.filter((token) => token.id !== data.record.id);
          default:
            return prevTokens;
        }
      });
    };

    // Subscribe to real-time updates
    pb.collection("tokens")
      .subscribe("*", handleRealtimeUpdate)
      .catch(() => {
        alert("Error subscribing to tokens, close the app and try again");
      });

    return () => {
      pb.collection("tokens").unsubscribe("*");
    };
  }, [user, queryClient]);

  return { tokens, loading, refetch };
};

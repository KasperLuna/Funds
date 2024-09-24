import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../pocketbase/pocketbase";
import { Bank } from "../types";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export const useBanksQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchBanks = async () => {
    const result = await pb.collection("banks").getFullList<Bank>({
      sort: "-balance",
    });
    return result;
  };

  const {
    data: banks = [],
    isLoading: loading,
    refetch,
  } = useQuery<Bank[]>({
    queryKey: ["banks", user?.id],
    queryFn: fetchBanks,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const handleRealtimeUpdate = (data: { action: string; record: Bank }) => {
      queryClient.setQueryData<Bank[]>(["banks", user.id], (prevBanks) => {
        if (!prevBanks) return [];

        switch (data.action) {
          case "create":
            return [data.record, ...prevBanks];
          case "update":
            return prevBanks.map((bank) =>
              bank.id === data.record.id ? data.record : bank
            );
          case "delete":
            return prevBanks.filter((bank) => bank.id !== data.record.id);
          default:
            return prevBanks;
        }
      });
    };

    // Subscribe to real-time updates
    pb.collection("banks")
      .subscribe("*", handleRealtimeUpdate)
      .catch(() => {
        alert("Error subscribing to banks, close the app and try again");
      });

    return () => {
      pb.collection("banks").unsubscribe("*");
    };
  }, [user, queryClient]);

  return { banks, loading, refetch };
};

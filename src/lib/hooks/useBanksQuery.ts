import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../pocketbase/pocketbase";
import { Bank } from "../types";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

// Module-level variables to ensure subscription is only set up once
let isSubscribedToBanks = false;
let subscriptionPromise: Promise<void> | null = null;

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
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Bank[]>({
    queryKey: ["banks", user?.id],
    queryFn: fetchBanks,
    enabled: !!user,
  });

  const loading = isLoading || isRefetching;

  useEffect(() => {
    if (!user || isSubscribedToBanks || subscriptionPromise) return;

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

    // Set subscription promise immediately to prevent multiple subscriptions
    subscriptionPromise = pb
      .collection("banks")
      .subscribe("*", handleRealtimeUpdate)
      .then(() => {
        isSubscribedToBanks = true;
        subscriptionPromise = null;
      })
      .catch(() => {
        subscriptionPromise = null;
        alert("Error subscribing to banks, close the app and try again");
      });

    // Only unsubscribe if the app is unmounted (not on every hook unmount)
    // Optionally, you can add a window unload event to clean up
    return () => {
      // No-op: do not unsubscribe on every hook unmount
    };
  }, [user, queryClient]);

  return { banks, loading, refetch };
};

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userQuery } from "../pocketbase/queries";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { pb } from "../pocketbase/pocketbase";

// Module-level variable to ensure subscription is only set up once
let isSubscribedToUser = false;

export const useUserQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: userQuery,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || isSubscribedToUser) return;

    const handleRealtimeUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    };

    pb.collection("users")
      .subscribe("*", handleRealtimeUpdate)
      .then(() => {
        isSubscribedToUser = true;
      })
      .catch(() => {
        alert("Error subscribing to users, close the app and try again");
      });

    // Only unsubscribe if the app is unmounted (not on every hook unmount)
    // Optionally, you can add a window unload event to clean up
    return () => {
      // No-op: do not unsubscribe on every hook unmount
    };
  }, [user, queryClient]);

  return { data, isLoading, baseCurrency: data?.currency };
};

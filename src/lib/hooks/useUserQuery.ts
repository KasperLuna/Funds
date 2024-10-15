import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userQuery } from "../pocketbase/queries";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { pb } from "../pocketbase/pocketbase";

export const useUserQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: userQuery,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const handleRealtimeUpdate = () =>
      // data: { action: string; record: User }
      {
        queryClient.invalidateQueries({ queryKey: ["user"] });
      };

    // Subscribe to real-time updates
    pb.collection("users")
      .subscribe("*", handleRealtimeUpdate)
      .catch(() => {
        alert("Error subscribing to users, close the app and try again");
      });

    return () => {
      pb.collection("users").unsubscribe("*");
    };
  }, [user, queryClient]);

  return { data, isLoading };
};

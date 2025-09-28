import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../pocketbase/pocketbase";
import { Category } from "../types";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

// Module-level variable to ensure subscription is only set up once
let isSubscribedToCategories = false;

export const useCategoriesQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchCategories = async () => {
    const result = await pb.collection("categories").getFullList<Category>({
      sort: "-name",
    });
    return result;
  };

  const {
    data: categories = [],
    isLoading: loading,
    refetch,
  } = useQuery<Category[]>({
    queryKey: ["categories", user?.id],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || isSubscribedToCategories) return;

    const handleRealtimeUpdate = (data: {
      action: string;
      record: Category;
    }) => {
      queryClient.setQueryData<Category[]>(
        ["categories", user.id],
        (prevCategs) => {
          if (!prevCategs) return [];

          switch (data.action) {
            case "create":
              return [data.record, ...prevCategs];
            case "update":
              return prevCategs.map((categ) =>
                categ.id === data.record.id ? data.record : categ
              );
            case "delete":
              return prevCategs.filter((categ) => categ.id !== data.record.id);
            default:
              return prevCategs;
          }
        }
      );
    };

    pb.collection("categories")
      .subscribe("*", handleRealtimeUpdate)
      .then(() => {
        isSubscribedToCategories = true;
      })
      .catch(() => {
        alert("Error subscribing to categories, close the app and try again");
      });

    // Only unsubscribe if the app is unmounted (not on every hook unmount)
    // Optionally, you can add a window unload event to clean up
    return () => {
      // No-op: do not unsubscribe on every hook unmount
    };
  }, [user, queryClient]);

  return { categories, loading, refetch };
};

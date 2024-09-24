import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../pocketbase/pocketbase";
import { Category } from "../types";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

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
    if (!user) return;

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

    // Subscribe to real-time updates
    pb.collection("categories")
      .subscribe("*", handleRealtimeUpdate)
      .catch(() => {
        alert("Error subscribing to categories, close the app and try again");
      });

    return () => {
      pb.collection("categories").unsubscribe("*");
    };
  }, [user, queryClient]);

  return { categories, loading, refetch };
};

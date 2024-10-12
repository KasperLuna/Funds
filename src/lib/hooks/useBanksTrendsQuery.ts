import { useQuery } from "@tanstack/react-query";
import { Trend } from "../types";
import { useAuth } from "./useAuth";
import { fetchBanksTrends } from "../pocketbase/queries";

export const useBanksTrendsQuery = () => {
  const { user } = useAuth();

  const { data: trends = [], isLoading: loading } = useQuery<Trend[]>({
    queryKey: ["bankTrends", user?.id],
    queryFn: fetchBanksTrends,
    enabled: !!user,
  });

  return { trends, loading };
};

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pocketbase/pocketbase";
import { queryKeys } from "./queryKeys";
import type { Transfer, Transaction } from "@/lib/types";

/**
 * Creates a transfer between two banks by generating two transactions:
 * 1. A "withdrawal" from the origin bank
 * 2. A "deposit" to the destination bank
 *
 * If the deposit fails after the withdrawal succeeds, the withdrawal is
 * rolled back (deleted) to preserve balance consistency.
 */
export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transfer: Transfer) => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("User not authenticated");

      const dateStr =
        transfer.date instanceof Date ? transfer.date.toISOString() : String(transfer.date);

      // Step 1: Create withdrawal from origin bank
      const withdrawal = await pb.collection("transactions").create<Transaction>({
        user: userId,
        description: transfer.description,
        type: "withdrawal",
        amount: transfer.originAmount,
        bank: transfer.originBank,
        categories: transfer.category ?? [],
        date: dateStr,
      });

      // Step 2: Create deposit to destination bank
      try {
        const deposit = await pb.collection("transactions").create<Transaction>({
          user: userId,
          description: transfer.description,
          type: "deposit",
          amount: transfer.destinationAmount,
          bank: transfer.destinationBank,
          categories: transfer.category ?? [],
          date: dateStr,
        });

        return { withdrawal, deposit };
      } catch (error) {
        // Rollback: delete the withdrawal if the deposit fails
        try {
          await pb.collection("transactions").delete(withdrawal.id!);
        } catch {
          // If rollback also fails, we still throw the original error
        }
        throw error;
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.banks.all });
    },
  });
}

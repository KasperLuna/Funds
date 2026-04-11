import { z } from "zod";

export const transactionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  type: z.enum(["income", "expense", "deposit", "withdrawal"]),
  amount: z.number().positive("Amount must be positive"),
  bank: z.string().min(1, "Bank is required"),
  categories: z.array(z.string()).min(1, "At least one category is required"),
  date: z.coerce.date(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

export const transferSchema = z.object({
  description: z.string().min(1, "Description is required"),
  originAmount: z.number().positive("Origin amount must be positive"),
  destinationAmount: z.number().positive("Destination amount must be positive"),
  originBank: z.string().min(1, "Origin bank is required"),
  destinationBank: z.string().min(1, "Destination bank is required"),
  date: z.coerce.date(),
  category: z.array(z.string()).optional(),
});

export type TransferFormData = z.infer<typeof transferSchema>;

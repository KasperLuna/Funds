import { z } from "zod";

export const plannedTransactionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  type: z.enum(["income", "expense", "deposit", "withdrawal"]),
  amount: z.number().positive("Amount must be positive"),
  bank: z.string().min(1, "Bank is required"),
  categories: z.array(z.string()).min(1, "At least one category is required"),
  recurrence: z.object({
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().min(1, "Interval must be at least 1").optional(),
  }),
  timezone: z
    .number()
    .int()
    .min(-12, "Timezone must be between -12 and 14")
    .max(14, "Timezone must be between -12 and 14"),
});

export type PlannedTransactionFormValues = z.infer<typeof plannedTransactionSchema>;

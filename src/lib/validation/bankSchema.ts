import { z } from "zod";

export const bankSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

export type BankFormData = z.infer<typeof bankSchema>;

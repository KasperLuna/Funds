import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  monthly_budget: z.preprocess(
    (val) => (val === "" || Number.isNaN(val) ? undefined : Number(val)),
    z.number().positive("Budget must be a positive number").optional(),
  ),
  hideable: z.boolean(),
  total_exempt: z.boolean().optional(),
});

export type CategorySchemaFormData = z.infer<typeof categorySchema>;

import { z } from "zod";

export const tokenSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  coingecko_id: z.string().min(1, "CoinGecko ID is required"),
  total: z.coerce.number().positive("Quantity must be positive"),
  costAvg: z.coerce.number().min(0, "Cost average must be non-negative"),
});

export type TokenSchemaFormData = z.infer<typeof tokenSchema>;

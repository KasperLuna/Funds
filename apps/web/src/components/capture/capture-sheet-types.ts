export type AccountOption = {
  id: string;
  name: string;
  assetId: string;
  decimals: number;
  assetCode?: string;
};

export type CategoryOption = {
  id: string;
  name: string;
  color?: string | null;
};

export type VoicePrefill = {
  accountId: string | null;
  amountInput: string | null;
  categoryIds: string[];
  description: string;
  /** Edit prefill: preserve the original type/date instead of defaulting. */
  type?: "income" | "expense";
  date?: number;
};

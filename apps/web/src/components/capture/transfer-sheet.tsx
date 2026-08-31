"use client";

import { TransferForm } from "./transfer-form";
import type { Category } from "@/lib/categories/categories-store";
import type { AccountOption, CategoryOption } from "./capture-sheet";
import type { TransferRows } from "@/lib/capture";

export interface TransferSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  accounts: AccountOption[];
  categories?: CategoryOption[];
  onSave: (rows: TransferRows) => void;
  onCreateCategory?: (c: Category) => void;
  defaultFromAccountId?: string;
}

export const TransferSheet = (props: TransferSheetProps) => {
  const {
    isOpen: open,
    onOpenChange,
    accounts,
    categories = [],
    onSave,
    onCreateCategory,
    defaultFromAccountId,
  } = props;
  if (!open) return null;
  return (
    <TransferForm
      onOpenChange={onOpenChange}
      accounts={accounts}
      categories={categories}
      onSave={onSave}
      onCreateCategory={onCreateCategory}
      defaultFromAccountId={defaultFromAccountId}
    />
  );
};

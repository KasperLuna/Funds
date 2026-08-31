"use client";

import type { Category } from "@/lib/categories/categories-store";
import { CategoryForm } from "./category-form";

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (c: Category) => void;
  editCategory: Category | null;
  assets: Array<{ id: string; code: string; decimals: number }>;
  defaultAssetId: string | null;
}

export const CategoryDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  editCategory,
  assets,
  defaultAssetId,
}: CategoryDialogProps) => {
  if (!isOpen) return null;
  return (
    <CategoryForm
      onOpenChange={onOpenChange}
      onSave={onSave}
      editCategory={editCategory}
      assets={assets}
      defaultAssetId={defaultAssetId}
    />
  );
};

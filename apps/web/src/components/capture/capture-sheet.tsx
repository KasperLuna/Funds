"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CaptureForm } from "./capture-form";
import type { Template } from "@/lib/templates/templates-store";
import type { Category } from "@/lib/categories/categories-store";
import type { RecentTxn } from "@/lib/capture";
import {
  type AccountOption,
  type CategoryOption,
  type VoicePrefill,
} from "./capture-sheet-types";

export type { AccountOption, CategoryOption, VoicePrefill } from "./capture-sheet-types";

export interface CaptureSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  accounts: AccountOption[];
  categories: CategoryOption[];
  recentTxns: RecentTxn[];
  onSave: (row: Record<string, unknown>) => void;
  defaultAccountId?: string;
  voicePrefill?: VoicePrefill;
  editing?: boolean;
  templates?: Template[];
  onCreateCategory?: (c: Category) => void;
}

export const CaptureSheet = (props: CaptureSheetProps) => {
  const { isOpen: open, onOpenChange } = props;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        <CaptureForm {...props} open={open} />
      </SheetContent>
    </Sheet>
  );
};

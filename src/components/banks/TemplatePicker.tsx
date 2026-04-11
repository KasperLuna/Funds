import React, { useState } from "react";
import { usePlannedTransactions } from "@/hooks/usePlannedTransactions";
import { useCategoriesQuery } from "@/lib/hooks/useCategoriesQuery";
import { PlannedTransaction, Currency } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from "lucide-react";
import { usePrivacy } from "@/hooks/usePrivacy";
import { parseAmount } from "@/lib/utils";
import { useUserQuery } from "@/lib/hooks/useUserQuery";
import { PrivacyPeek } from "@/components/PrivacyPeek";

interface TemplatePickerProps {
  onSelect: (template: PlannedTransaction) => void;
}

function TemplateListContent({
  loading,
  templates,
  isPrivate,
  baseCurrency,
  confirmDeleteId,
  onSelect,
  onDelete,
}: {
  loading: boolean;
  templates: PlannedTransaction[];
  isPrivate: boolean;
  baseCurrency: Currency | undefined;
  confirmDeleteId: string | null;
  onSelect: (t: PlannedTransaction) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  if (loading) {
    return <div className="p-3 text-sm text-slate-400">Loading...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="p-3 text-sm text-slate-400">
        No templates yet. Create one from the &quot;Template&quot; option in the
        create menu.
      </div>
    );
  }

  return (
    <div className="max-h-60 overflow-y-auto">
      {templates.map((t) => (
        <div
          key={t.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(t)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(t);
            }
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-700/60 transition-colors border-b border-slate-700/50 last:border-b-0 cursor-pointer"
        >
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-slate-100 truncate">
              {t.name || t.description || "(Unnamed)"}
            </span>
            {t.name && t.description && (
              <span className="text-xs text-slate-400 truncate">
                {t.description}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <span
              className={
                t.amount < 0 || t.type === "expense"
                  ? "text-xs font-mono text-red-400"
                  : "text-xs font-mono text-emerald-400"
              }
            >
              <PrivacyPeek
                isPrivate={isPrivate}
                revealedContent={parseAmount(
                  Math.abs(t.amount),
                  baseCurrency?.code,
                )}
                maskedContent={`${baseCurrency?.symbol ?? "$"}••••`}
              />
            </span>
            <button
              type="button"
              onClick={(e) => onDelete(e, t.id!)}
              className={`p-1 rounded hover:bg-slate-600 transition-colors ${
                confirmDeleteId === t.id
                  ? "text-red-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              title={
                confirmDeleteId === t.id
                  ? "Click again to confirm"
                  : "Delete template"
              }
              aria-label="Delete template"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ onSelect }) => {
  const { templates, templatesLoading, deletePlannedTransaction } =
    usePlannedTransactions();
  const categoryData = useCategoriesQuery();
  const { baseCurrency } = useUserQuery();
  const { isPrivate } = usePrivacy();
  const [open, setOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSelect = (template: PlannedTransaction) => {
    const mapped: PlannedTransaction = {
      ...template,
      categories: template.categories.map((catId) => {
        const cat = categoryData?.categories.find((c) => c.id === catId);
        return cat?.name || catId;
      }),
      amount: Math.abs(template.amount),
      type: ["expense", "withdrawal"].includes(template.type)
        ? "expense"
        : "income",
    };
    onSelect(mapped);
    setOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      await deletePlannedTransaction(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300 hover:text-slate-100 gap-1.5 h-8 px-2.5 text-xs"
        >
          <FileText className="size-3.5" />
          Templates
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 bg-slate-800 border-slate-700"
        align="start"
      >
        <TemplateListContent
          loading={templatesLoading}
          templates={templates}
          isPrivate={isPrivate}
          baseCurrency={baseCurrency}
          confirmDeleteId={confirmDeleteId}
          onSelect={handleSelect}
          onDelete={handleDelete}
        />
      </PopoverContent>
    </Popover>
  );
};

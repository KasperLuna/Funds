"use client";

import { Check, ChevronDown, ChevronRight, LayoutTemplate } from "lucide-react";
import {
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { SegmentedControl } from "@/components/ui/segmented";
import { ContextPopover } from "@/components/capture/context-popover";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/templates/templates-store";
import type { AccountOption, CategoryOption } from "@/components/capture/capture-sheet";

interface ContextChipProps extends React.ComponentProps<"button"> {
  active?: boolean;
}

function ContextChip({ active, children, className, ...props }: ContextChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm font-medium transition-colors duration-150 ease-out hover:bg-(--surface-3) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
        active ? "text-inherit" : "text-zinc-400 hover:text-inherit",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface CaretProps {
  isOpen: boolean;
}

function Caret({ isOpen }: CaretProps) {
  return (
    <ChevronDown
      className={cn("h-4 w-4 text-zinc-500 transition-transform duration-150 ease-out", isOpen && "rotate-180")}
      aria-hidden
    />
  );
}

export interface CaptureFormFieldsProps {
  accounts: AccountOption[];
  categories: CategoryOption[];
  templates: Template[];
  accountId: string;
  selected: AccountOption | undefined;
  onAccountChange: (id: string) => void;
  type: "income" | "expense";
  onTypeChange: (next: "income" | "expense") => void;
  description: string;
  onDescriptionChange: (next: string) => void;
  categoryIds: string[];
  onToggleCategory: (id: string) => void;
  datePreset: "today" | "yesterday";
  dateOverride: number | null;
  onDatePreset: (preset: "today" | "yesterday") => void;
  onDateOverride: (ts: number | null) => void;
  activeTemplateId: string | null;
  onApplyTemplate: (t: Template) => void;
  activeTemplate: Template | undefined;
  dateLabel: string;
  formatCustomDate: (ts: number) => string;
}

export const CaptureFormFields = (props: CaptureFormFieldsProps) => {
  const {
    accounts,
    categories,
    templates,
    accountId,
    selected,
    onAccountChange,
    type,
    onTypeChange,
    description,
    onDescriptionChange,
    categoryIds,
    onToggleCategory,
    datePreset,
    dateOverride,
    onDatePreset,
    onDateOverride,
    activeTemplateId,
    onApplyTemplate,
    activeTemplate,
    dateLabel,
  } = props;

  return (
    <>
      {/* Context strip — quiet chips: account · date · templates (nested). */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ContextPopover>
          {({ isOpen: accountOpen, setOpen: setAccountOpen }) => (
            <>
              <PopoverTrigger asChild>
                <ContextChip active={accountOpen} aria-label="Account">
                  <span className="max-w-40 truncate">{selected?.name ?? "Account"}</span>
                  <Caret isOpen={accountOpen} />
                </ContextChip>
              </PopoverTrigger>
              <PopoverContent align="start">
                <div role="listbox" aria-label="Account" className="flex flex-col gap-0.5">
                  {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      role="option"
                      aria-selected={a.id === accountId}
                      onClick={() => {
                        onAccountChange(a.id);
                        setAccountOpen(false);
                      }}
                      className={cn(
                        "flex min-h-11 items-center justify-between gap-3 rounded-(--radius-sm) px-3 text-sm transition-colors hover:bg-(--surface-2) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                        a.id === accountId ? "font-semibold text-inherit" : "text-zinc-400",
                      )}
                    >
                      <span className="truncate">{a.name}</span>
                      {a.id === accountId && (
                        <Check className="h-4 w-4 shrink-0 text-(--accent)" strokeWidth={3} aria-hidden />
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </>
          )}
        </ContextPopover>

        <ContextPopover>
          {({ isOpen: dateOpen, setOpen: setDateOpen }) => (
            <>
              <PopoverTrigger asChild>
                <ContextChip active={dateOpen} aria-label="Date">
                  <span className="tabular-nums">{dateLabel}</span>
                  <Caret isOpen={dateOpen} />
                </ContextChip>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto min-w-64">
                <div className="flex gap-1.5 p-1">
                  {(["today", "yesterday"] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={!dateOverride && datePreset === preset}
                      onClick={() => onDatePreset(preset)}
                      className={cn(
                        "min-h-11 flex-1 rounded-(--radius-sm) px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                        !dateOverride && datePreset === preset
                          ? "bg-(--surface-2) text-inherit"
                          : "text-zinc-400 hover:bg-(--surface-2) hover:text-inherit",
                      )}
                    >
                      {preset === "today" ? "Today" : "Yesterday"}
                    </button>
                  ))}
                </div>
                <div className="mt-1 border-t border-(--border) pt-1.5">
                  <Calendar
                    mode="single"
                    selected={dateOverride ? new Date(dateOverride) : undefined}
                    defaultMonth={new Date()}
                    onSelect={(day) => {
                      if (!day) return;
                      onDateOverride(day.getTime());
                      setDateOpen(false);
                    }}
                  />
                </div>
              </PopoverContent>
            </>
          )}
        </ContextPopover>

        {templates.length > 0 && (
          <ContextPopover>
            {({ isOpen: templatesOpen, setOpen: setTemplatesOpen }) => (
              <>
                <PopoverTrigger asChild>
                  <ContextChip active={templatesOpen || !!activeTemplate} aria-label="Templates">
                    {activeTemplate ? (
                      <>
                        <Check className="h-4 w-4 text-(--accent)" strokeWidth={3} aria-hidden />
                        <span className="max-w-40 truncate">{activeTemplate.name}</span>
                      </>
                    ) : (
                      <>
                        <LayoutTemplate className="h-4 w-4" aria-hidden />
                        <span>Templates</span>
                      </>
                    )}
                    <Caret isOpen={templatesOpen} />
                  </ContextChip>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64">
                  <p className="label-micro px-3 pb-1 pt-1.5">Apply a template</p>
                  <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                    {templates.map((t) => {
                      const isActive = activeTemplateId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            onApplyTemplate(t);
                            setTemplatesOpen(false);
                          }}
                          className={cn(
                            "flex min-h-11 items-center justify-between gap-3 rounded-(--radius-sm) px-3 text-sm transition-colors hover:bg-(--surface-2) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                            isActive ? "font-semibold text-inherit" : "text-zinc-400",
                          )}
                        >
                          <span className="truncate">{t.name}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </>
            )}
          </ContextPopover>
        )}
      </div>

      <input
        aria-label="Description"
        className="mt-4 h-11 w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-zinc-200 placeholder:text-zinc-500 transition-colors focus-visible:outline-2 focus-visible:outline-(--accent)"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />

      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Categories">
          {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
            const active = categoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleCategory(c.id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-sm) px-2.5 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
                  active ? "text-(--accent)" : "text-zinc-400 hover:text-inherit",
                )}
              >
                {active && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <SegmentedControl
          options={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ]}
          value={type}
          onChange={(v) => onTypeChange(v)}
        />
      </div>
    </>
  );
};

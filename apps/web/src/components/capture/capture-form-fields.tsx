"use client";

import { CalendarDays, LayoutTemplate } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryChipSelect } from "@/components/capture/category-chip-select";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/templates/templates-store";
import type {
  AccountOption,
  CategoryOption,
} from "@/components/capture/capture-sheet";

const triggerCls =
  "h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm font-medium text-zinc-400 transition-colors duration-150 ease-out hover:bg-(--surface-3) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none data-[state=open]:text-inherit data-[placeholder]:text-zinc-400 dark:bg-(--surface-2) dark:hover:bg-(--surface-3) [&_svg]:opacity-100";

export interface CaptureFormFieldsProps {
  accounts: AccountOption[];
  categories: CategoryOption[];
  templates: Template[];
  accountId: string;
  selected: AccountOption | undefined;
  onAccountChange: (id: string) => void;
  description: string;
  onDescriptionChange: (next: string) => void;
  categoryIds: string[];
  onCategoryChange: (next: string[]) => void;
  datePreset: "today" | "yesterday";
  dateOverride: number | null;
  onDatePreset: (preset: "today" | "yesterday") => void;
  onDateOverride: (ts: number | null) => void;
  activeTemplateId: string | null;
  onApplyTemplate: (t: Template) => void;
  activeTemplate: Template | undefined;
  dateLabel: string;
}

export const CaptureFormFields = (props: CaptureFormFieldsProps) => {
  const {
    accounts,
    categories,
    templates,
    accountId,
    onAccountChange,
    description,
    onDescriptionChange,
    categoryIds,
    onCategoryChange,
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
      {/* Context strip — quiet chips: account · date · templates (nested).
          Single-line on purpose: chips truncate inside their own bounds
          rather than wrapping to a new line, so the strip's vertical rhythm
          stays consistent. When the natural widths exceed the viewport, the
          rightmost chip is clipped by the strip's overflow-hidden — its
          visible portion is still 44pt+ and tappable. */}
      <div className="mt-3 flex flex-nowrap items-center gap-1.5 overflow-hidden">
        <Select
          value={accountId || "__placeholder__"}
          onValueChange={(v) =>
            onAccountChange(v === "__placeholder__" ? "" : v)
          }
        >
          <SelectTrigger aria-label="Account" className={triggerCls}>
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" disabled>
              Account
            </SelectItem>
            {[...accounts]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Date"
              className={cn(triggerCls, "inline-flex")}
            >
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-left tabular-nums">
                {dateLabel}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto max-h-[var(--radix-popper-available-height)] min-w-64 overflow-y-auto p-0"
          >
            <div className="flex gap-1.5 p-1">
              {(["today", "yesterday"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={!dateOverride && datePreset === preset}
                  onClick={() => onDatePreset(preset)}
                  className={
                    "min-h-11 flex-1 items-center rounded-(--radius-sm) px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none " +
                    (!dateOverride && datePreset === preset
                      ? "bg-(--surface-2) text-inherit"
                      : "text-zinc-400 hover:bg-(--surface-2) hover:text-inherit")
                  }
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
                }}
              />
            </div>
          </PopoverContent>
        </Popover>

        {templates.length > 0 && (
          <Select
            value={activeTemplateId || "__placeholder__"}
            onValueChange={(v) => {
              if (v === "__placeholder__") {
                if (activeTemplate) onApplyTemplate(activeTemplate);
                return;
              }
              const next = templates.find((t) => t.id === v);
              if (next) onApplyTemplate(next);
            }}
          >
            <SelectTrigger aria-label="Templates" className={triggerCls}>
              <LayoutTemplate className="h-4 w-4 shrink-0" aria-hidden />
              <SelectValue placeholder="Templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__placeholder__" disabled>
                Templates
              </SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Input
        aria-label="Description"
        className="mt-3 h-11 text-base"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />

      <CategoryChipSelect
        className="mt-3"
        categories={categories}
        value={categoryIds}
        onChange={onCategoryChange}
      />
    </>
  );
};

"use client";

import { useState } from "react";
import { Ellipsis, Pause, Pencil, Play, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { ScheduledTxn } from "@/lib/scheduled/compute";

interface ScheduledRowPopoverProps {
  row: ScheduledTxn;
  onToggle: (row: ScheduledTxn) => void;
  onEdit: (row: ScheduledTxn) => void;
  onDelete: (row: ScheduledTxn) => void;
}

function RowPopover({ children }: { children: (controls: { open: boolean; setOpen: (open: boolean) => void }) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>{children({ open, setOpen })}</Popover>;
}

export const ScheduledRowPopover = ({
  row,
  onToggle,
  onEdit,
  onDelete,
}: ScheduledRowPopoverProps) => {
  return (
    <RowPopover>
      {({ open, setOpen }) => (
        <>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Schedule actions"
              aria-expanded={open}
              className="sm:hidden"
            >
              <Ellipsis className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1 sm:hidden">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  onToggle(row);
                  setOpen(false);
                }}
                className="flex min-h-11 items-center gap-2.5 rounded-(--radius-sm) px-3 text-sm text-zinc-300 transition-colors hover:bg-(--surface-2) hover:text-inherit"
              >
                {row.active ? (
                  <Pause className="h-4 w-4 text-zinc-500" aria-hidden />
                ) : (
                  <Play className="h-4 w-4 text-zinc-500" aria-hidden />
                )}
                {row.active ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onEdit(row);
                  setOpen(false);
                }}
                className="flex min-h-11 items-center gap-2.5 rounded-(--radius-sm) px-3 text-sm text-zinc-300 transition-colors hover:bg-(--surface-2) hover:text-inherit"
              >
                <Pencil className="h-4 w-4 text-zinc-500" aria-hidden />
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(row);
                  setOpen(false);
                }}
                className="flex min-h-11 items-center gap-2.5 rounded-(--radius-sm) px-3 text-sm text-(--danger) transition-colors hover:bg-(--surface-2)"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </button>
            </div>
          </PopoverContent>
        </>
      )}
    </RowPopover>
  );
};

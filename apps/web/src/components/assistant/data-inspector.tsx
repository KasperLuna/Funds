"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { AssistantMessage } from "@/lib/assistant/types";

interface DataInspectorProps {
  message: AssistantMessage;
  onClose: () => void;
}

/**
 * Transparency panel: shows the raw validated payload that drove the widget.
 * The user can verify the source of every number, and the "from this device"
 * footer in the widget itself makes clear the numbers were re-derived from
 * local rows, not copied verbatim from the model.
 */
export const DataInspector = ({ message, onClose }: DataInspectorProps) => {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Underlying data</DialogTitle>
        <DialogDescription>
          This widget was generated on this device. Money and totals are
          re-derived from your local transaction rows after the assistant
          named the category or period.
        </DialogDescription>
        <pre className="mt-3 max-h-72 overflow-auto rounded-(--radius-md) bg-(--surface-2) p-3 text-[11px] text-zinc-300">
          {JSON.stringify(stripForDisplay(message), null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
};

function stripForDisplay(message: AssistantMessage) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(message)) {
    if (k !== "id" && k !== "role" && k !== "ts" && k !== "usedCase") out[k] = v;
  }
  return out;
}

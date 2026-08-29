"use client";

import { Dialog } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { AssistantPanel } from "./AssistantPanel";

/**
 * Bottom-sheet chat panel. Wraps AssistantPanel in the existing Dialog
 * shell — mobile: slide-up bottom sheet; desktop: centered plate dialog.
 * The `open` state is owned by the parent (AssistantButton or the page).
 */
export function AssistantSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[85dvh] flex-col overflow-hidden p-0 sm:h-[75dvh]">
        <AssistantPanel />
      </DialogContent>
    </Dialog>
  );
}

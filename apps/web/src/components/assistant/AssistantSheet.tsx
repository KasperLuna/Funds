"use client";

import { useEffect, useState } from "react";
import {
  Root as DialogRoot,
  Portal as DialogPortal,
  Overlay as DialogOverlay,
} from "@radix-ui/react-dialog";
import { AssistantPanel } from "./AssistantPanel";

/**
 * Bottom-sheet chat panel. On mobile it fills the viewport between the
 * top header and the bottom nav, so the assistant's thread gets the
 * full dvh to work with. On desktop it's a centered plate dialog. The
 * assistant's own header has a Close button — we don't render the
 * shared Dialog's X (it would duplicate) and we don't render the drag
 * handle (the panel header is the sheet's primary handle).
 */
export function AssistantSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Mirror the previous mount-on-open lifecycle so test ids and state
  // behave the same as the old Dialog-wrapped version.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;

  return (
    <DialogRoot open onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/80 data-[state=open]:animate-[funds-overlay-in_200ms_ease-out]" />
        <div
          className="fixed inset-x-0 z-50 flex min-h-0 flex-col overflow-hidden border border-b-0 border-(--border-strong) bg-(--surface-1) data-[state=open]:animate-[funds-sheet-in_250ms_cubic-bezier(0.32,0.72,0,1)] sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-(--radius-lg) sm:border-b"
          style={{
            top: "var(--chrome-header-h)",
            bottom: "var(--chrome-footer-h)",
          }}
        >
          <AssistantPanel onClose={onClose} />
        </div>
      </DialogPortal>
    </DialogRoot>
  );
}

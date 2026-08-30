"use client";

import { useEffect, useState } from "react";
import {
  Root as DialogRoot,
  Portal as DialogPortal,
  Overlay as DialogOverlay,
} from "@radix-ui/react-dialog";
import { AssistantPanel } from "./assistant-panel";

interface AssistantSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet chat panel. On mobile it fills the viewport between the
 * top header and the bottom nav, so the assistant's thread gets the
 * full dvh to work with. On desktop it's a centered plate dialog. The
 * assistant's own header has a Close button — we don't render the
 * shared Dialog's X (it would duplicate) and we don't render the drag
 * handle (the panel header is the sheet's primary handle).
 */
export const AssistantSheet = ({ open, onClose }: AssistantSheetProps) => {
  // cavetail: mirror `open` → `mounted` so Radix's exit animation can play
  // before we unmount; without this delay the sheet snaps shut.
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    // Cavetail: previous version only ever flipped mounted → true. Combined
    // with the JSX `open` shorthand below (a literal true) the DialogRoot
    // became permanently open after the first open — every screen tap was
    // eaten by the stuck z-40 overlay. Track both edges.
    if (open) setMounted(true);
    if (!open && mounted) {
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <DialogRoot open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/80 data-[state=open]:animate-[funds-overlay-in_200ms_ease-out]" />
        <div
          className="fixed inset-x-0 z-50 flex min-h-0 flex-col overflow-hidden border border-b-0 border-(--border-strong) bg-(--bg) data-[state=open]:animate-[funds-sheet-in_180ms_cubic-bezier(0.32,0.72,0,1)] sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-(--radius-lg) sm:border-b"
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
};

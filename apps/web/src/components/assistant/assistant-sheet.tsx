"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AssistantPanel } from "./assistant-panel";

interface AssistantSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet chat panel. On mobile it fills the viewport between the
 * top header and the bottom nav, so the assistant's thread gets the
 * full dvh to work with. On desktop it's a centered plate dialog. The
 * assistant's own header has a Close button — we don't render the
 * shared Sheet's X (it would duplicate) and we don't render the drag
 * handle (the panel header is the sheet's primary handle).
 *
 * Backed by vaul on mobile (real iOS drag-to-dismiss — fixes the half-
 * press bug the previous Radix-Dialog-as-sheet had) and Radix Dialog
 * on desktop. The mobile-only chrome-height offset lives in globals.css
 * under `[data-mobile-frame]` and only fires below the sm: breakpoint,
 * so the desktop dialog stays centered.
 */
export const AssistantSheet = ({ isOpen, onClose }: AssistantSheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        showCloseButton={false}
        className={cn(
          "flex min-h-0 flex-col overflow-hidden p-0",
          "max-sm:rounded-none max-sm:border-0",
        )}
        data-mobile-frame
      >
        <SheetTitle className="sr-only">Assistant</SheetTitle>
        <SheetDescription className="sr-only">
          Chat with the on-device finance assistant.
        </SheetDescription>
        <AssistantPanel onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
};

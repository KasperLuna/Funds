import {
  Root as DialogRoot,
  Trigger as DialogTrigger,
  Close as DialogClose,
  Portal as DialogPortal,
  Overlay as DialogOverlay,
  Content as DialogContentPrimitive,
  Title as DialogTitle,
  Description as DialogDescription,
} from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export { DialogRoot as Dialog, DialogTrigger, DialogClose };

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogContentPrimitive>) {
  return (
    <DialogPortal>
      <DialogOverlay className="fixed inset-0 z-40 bg-black/80 data-[state=open]:animate-[funds-overlay-in_200ms_ease-out]" />
      <DialogContentPrimitive
        className={cn(
          // Mobile: bottom sheet, near-full height so content never feels clipped.
          "fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-(--radius-sheet) border border-(--border-strong) border-b-0 bg-(--surface-1) p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
          "data-[state=open]:animate-[funds-sheet-in_250ms_cubic-bezier(0.32,0.72,0,1)]",
          // Desktop: centered plate dialog. Must clear the mobile bottom-anchor
          // (bottom-0/inset-x-0) or it pins the height to viewport − 50%.
          "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:right-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-(--radius-lg) sm:border-b sm:data-[state=open]:animate-[funds-dialog-in_200ms_cubic-bezier(0.32,0.72,0,1)]",
          className,
        )}
        {...props}
      >
        <div
          className="mx-auto mb-1 mt-1 h-1 w-10 rounded-full bg-(--border-strong) sm:hidden"
          aria-hidden
        />
        <DialogClose
          aria-label="Close"
          className="absolute right-3 top-3 rounded-(--radius-sm) p-1.5 text-zinc-500 transition-colors hover:bg-(--surface-3) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
        >
          <X className="h-4 w-4" aria-hidden />
        </DialogClose>
        {children}
      </DialogContentPrimitive>
    </DialogPortal>
  );
}

export function DialogContentTitle({
  className,
  ...props
}: ComponentProps<typeof DialogTitle>) {
  return (
    <DialogTitle
      className={cn("pr-8 text-lg font-semibold", className)}
      {...props}
    />
  );
}

export function DialogContentDescription({
  className,
  ...props
}: ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn("text-sm text-zinc-500", className)}
      {...props}
    />
  );
}

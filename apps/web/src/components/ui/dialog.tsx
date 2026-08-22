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
      <DialogOverlay className="fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <DialogContentPrimitive
        className={cn(
          "fixed z-50 w-full rounded-t-(--radius-sheet) border border-(--border) bg-(--surface-1) p-4 shadow-lg focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-(--radius-lg)",
          className,
        )}
        {...props}
      >
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
    <DialogTitle className={cn("text-lg font-semibold", className)} {...props} />
  );
}

export function DialogContentDescription({
  className,
  ...props
}: ComponentProps<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn("text-sm text-slate-400", className)}
      {...props}
    />
  );
}
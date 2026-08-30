"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

type SheetContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const ctx = React.useContext(SheetContext);
  if (!ctx) {
    throw new Error("Sheet components must be used within <Sheet>");
  }
  return ctx;
}

type SheetProps = React.ComponentProps<typeof SheetPrimitive.Root>;

const Sheet = ({ open, onOpenChange, children }: SheetProps) => {
  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const handleOpenChange = React.useCallback(
    (o: boolean) => onOpenChangeRef.current?.(o),
    [],
  );
  return (
    <SheetContext.Provider
      value={{ open: open ?? false, onOpenChange: handleOpenChange }}
    >
      {children}
    </SheetContext.Provider>
  );
};
Sheet.displayName = "Sheet";

const SheetTrigger = (
  props: React.ComponentProps<typeof SheetPrimitive.Trigger>,
) => <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;

const SheetClose = (
  props: React.ComponentProps<typeof SheetPrimitive.Close>,
) => <SheetPrimitive.Close data-slot="sheet-close" {...props} />;

/**
 * Pick one of two surfaces based on viewport at mount time:
 *  - vaul Drawer for mobile (bottom-anchored, drag-to-dismiss, iOS-tested)
 *  - Radix Dialog for desktop (centered plate, modal, sm: breakpoint)
 * The two share <Sheet>'s `open` state and the same children, so callers
 * don't have to think about which surface they're rendering. The mobile
 * vaul drawer is the iOS-tested drag-to-dismiss path; the desktop Radix
 * Dialog is a proper centered modal instead of a stretched mobile sheet.
 */
interface SheetContentProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    "onAnimationEnd" | "onAnimationStart" | "onDrag"
  > {
  showCloseButton?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => {
  const { open, onOpenChange } = useSheetContext();
  // Pick the right surface at mount time based on viewport. jsdom's
  // matchMedia always reports false for (min-width: 640px), so tests see
  // only the vaul Drawer; real browsers see the Radix Dialog on sm:.
  // Re-evaluate on resize so the choice stays correct.
  const [isDesktop, setIsDesktop] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop ? (
    <SheetPrimitive.Root
      data-slot="sheet"
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetPrimitive.Portal data-slot="sheet-portal">
        <SheetPrimitive.Overlay
          data-slot="sheet-overlay"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        />
        <SheetPrimitive.Content
          ref={ref}
          data-slot="sheet-content"
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-(--radius-lg) border border-(--plate-edge) bg-(--plate-1)/92 p-6 shadow-[inset_0_1px_0_var(--plate-edge-inset)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            className,
          )}
        >
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close className="absolute right-4 top-4 rounded-(--radius-sm) p-1.5 opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-(--accent) disabled:pointer-events-none">
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  ) : (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground
      repositionInputs={false}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DrawerPrimitive.Content
          ref={ref}
          data-slot="sheet-content"
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[100dvh] flex-col rounded-t-(--radius-sheet) border border-b-0 border-(--plate-edge) bg-(--plate-1)/92 shadow-[inset_0_1px_0_var(--plate-edge-inset)] focus:outline-none",
            className,
          )}
          {...props}
        >
          <div className="mx-auto mt-3 h-1.5 w-14 shrink-0 rounded-full bg-white/30 opacity-70" />
          <DrawerPrimitive.Close className="absolute right-3 top-3 z-10 rounded-(--radius-sm) p-1.5 opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-(--accent) disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DrawerPrimitive.Close>
          {children}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
});
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="sheet-header"
    className={cn("flex flex-col gap-1.5", className)}
    {...props}
  />
);

const SheetFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="sheet-footer"
    className={cn("mt-auto flex flex-col gap-2", className)}
    {...props}
  />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    data-slot="sheet-title"
    className={cn("pr-8 text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    data-slot="sheet-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};

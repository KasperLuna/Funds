"use client";

import {
  Root as PopoverRoot,
  Trigger as PopoverTrigger,
  Portal as PopoverPortal,
  Content as PopoverContentPrimitive,
} from "@radix-ui/react-popover";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export { PopoverRoot as Popover, PopoverTrigger, PopoverPortal };

type PopoverContentProps = ComponentProps<typeof PopoverContentPrimitive>;

const PopoverContent = ({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: PopoverContentProps) => {
  return (
    <PopoverPortal>
      <PopoverContentPrimitive
        align={align}
        sideOffset={sideOffset}
        className={cn(
          // Intaglio plate: hairline border, surface-3 plate, no shadow.
          "z-50 min-w-44 max-h-[calc(100dvh-2rem)] overflow-hidden overflow-y-auto rounded-(--radius-md) border border-(--border-strong) bg-(--surface-3) p-1.5",
          "data-[state=open]:animate-[funds-popover-in_150ms_ease-out] data-[state=closed]:animate-[funds-popover-out_120ms_ease-in]",
          "focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPortal>
  );
};

export { PopoverContent };

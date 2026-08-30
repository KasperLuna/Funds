"use client";

import { useState } from "react";
import { Popover } from "@/components/ui/popover";

interface ContextPopoverProps {
  children: (controls: { isOpen: boolean; setOpen: (isOpen: boolean) => void }) => React.ReactNode;
}

/** Controlled popover whose open state is exposed to the trigger/caret. */
export const ContextPopover = ({ children }: ContextPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {children({ isOpen, setOpen: setIsOpen })}
    </Popover>
  );
};

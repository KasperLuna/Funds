"use client";

import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";

export const PrivacyToggle = () => {
  const masked = usePrivacyStore((s) => s.masked);
  const toggle = usePrivacyStore((s) => s.toggle);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 shrink-0 text-zinc-500" />
        <div>
          <p className="text-sm font-medium">Privacy mode</p>
          <p className="text-xs text-zinc-500">
            {masked ? "Values are hidden" : "Values are visible"}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={toggle}>
        {masked ? "Reveal" : "Hide"}
      </Button>
    </div>
  );
};

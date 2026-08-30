"use client";

import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/lib/privacy/privacy-context";

export const PrivacyToggle = () => {
  const { masked, toggle } = usePrivacy();
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

"use client";

import { Eye, EyeOff } from "lucide-react";
import { useUIStore } from "@/lib/stores/useUIStore";
import { Button } from "@/components/ui/button";

export function PrivacyToggle() {
  const { privacyMode, togglePrivacyMode } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={togglePrivacyMode}
      aria-label={privacyMode ? "Show amounts" : "Hide amounts"}
    >
      {privacyMode ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </Button>
  );
}

"use client";

import { usePWAInstall } from "@/lib/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";

export function InstallPrompt() {
  const { canInstall, install, isInstalled } = usePWAInstall();

  if (isInstalled || !canInstall) return null;

  return (
    <aside
      aria-label="Install application"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-lg border bg-background p-4 shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-80"
    >
      <p className="text-sm font-medium">Install Funds for a better experience</p>
      <Button size="sm" onClick={install}>
        Install
      </Button>
    </aside>
  );
}

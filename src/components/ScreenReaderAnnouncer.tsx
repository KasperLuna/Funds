"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/banks": "Banks",
  "/dashboard/crypto": "Crypto",
  "/dashboard/settings": "Settings",
};

/**
 * Announces page changes to screen readers via an aria-live region.
 * Renders a visually hidden element that updates on route changes.
 */
export function ScreenReaderAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const label = ROUTE_LABELS[pathname] ?? "Page";
    setAnnouncement(`Navigated to ${label}`);
  }, [pathname]);

  return (
    <output aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </output>
  );
}

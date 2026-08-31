"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { isIosStorageStale, isIosLikeDevice } from "@/lib/llm/capability";
import { getLlmEngine } from "@/lib/llm";

/**
 * Stale-storage banner. Shown when the device is iOS-like AND the last
 * successful load was more than 5 days ago. Tap to redownload.
 */
export const StaleBanner = () => {
  const [visible, setVisible] = useState(false);
  // cavetail: OPFS read is async + browser-side; can't be a useState initializer
  useEffect(() => {
    if (!isIosLikeDevice()) return;
    void getLlmEngine()
      .lastLoadedAt()
      .then((ts) => {
        if (isIosStorageStale(ts)) setVisible(true);
      });
  }, []);
  if (!visible) return null;
  return (
    <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-(--radius-md) border border-(--warning) bg-(--warning)/10 px-3 py-2 text-xs text-(--warning)">
      <span>Model may need a refresh — re-downloading keeps the assistant available offline.</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          // Trigger a reload by re-invoking getLlmEngine. The AssistantPanel
          // surfaces a fresh load via the status banner on the next send().
          void getLlmEngine().unload();
        }}
        className="inline-flex items-center gap-1 rounded-(--radius-sm) bg-(--warning) px-2 py-1 text-[10px] font-semibold text-zinc-900"
      >
        <RefreshCw className="h-3 w-3" aria-hidden />
        Refresh
      </button>
    </div>
  );
};

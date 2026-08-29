"use client";

import { Suspense } from "react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";

/**
 * Full-page assistant route. Renders AssistantPanel inline without the
 * sheet wrapper — the user navigates here to have a dedicated chat view.
 * Deep-linkable and shareable.
 */
export default function AssistantPage() {
  return (
    <Suspense>
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="h-[calc(100dvh-8rem)] overflow-hidden rounded-(--radius-lg) border border-(--border) bg-(--surface-1) md:h-[calc(100dvh-4rem)]">
          <AssistantPanel />
        </div>
      </div>
    </Suspense>
  );
}

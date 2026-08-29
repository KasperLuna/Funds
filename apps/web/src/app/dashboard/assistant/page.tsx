"use client";

import { Suspense } from "react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";

/**
 * Full-page assistant route. Renders AssistantPanel inline without the
 * sheet wrapper — the user navigates here to have a dedicated chat view.
 * Deep-linkable and shareable.
 *
 * Height model: on mobile the page is `fixed` and pinned to the chrome
 * slots so it actually reaches the viewport edges despite the
 * dashboard's `<main>` adding `pt-4 pb-20` (16/80pt) padding. The
 * `--chrome-header-h` / `--chrome-footer-h` vars (defined in
 * globals.css, 0px on desktop) hold the real top/bottom heights.
 *
 * On desktop the layout has no top/bottom chrome and the page uses a
 * plain viewport-height calc.
 */
export default function AssistantPage() {
  return (
    <Suspense>
      <div
        className="fixed inset-x-0 z-10 flex min-h-0 flex-col bg-(--bg) md:static md:z-auto md:h-[calc(100dvh-2rem)]"
        style={{
          top: "var(--chrome-header-h)",
          bottom: "var(--chrome-footer-h)",
        }}
      >
        <AssistantPanel />
      </div>
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  parseBrowserInfo,
  isBrowserSupported,
  getMinBrowserRequirements,
} from "@/lib/utils/browser-compat";

/**
 * Displays a dismissible banner when the current browser does not meet
 * the minimum version requirements (Requirement 19.5).
 *
 * The component renders nothing on the server and only evaluates the
 * user-agent string after hydration.
 */
export function UnsupportedBrowserWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const info = parseBrowserInfo(navigator.userAgent);
    if (!isBrowserSupported(info)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      role="alert"
      className="bg-yellow-600 text-white px-4 py-3 text-center text-sm flex items-center justify-center gap-2"
    >
      <span>
        Your browser may not be fully supported. For the best experience, please use{" "}
        {getMinBrowserRequirements()}.
      </span>
      <button
        type="button"
        onClick={() => setShow(false)}
        className="ml-2 underline font-medium hover:opacity-80 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
        aria-label="Dismiss browser warning"
      >
        Dismiss
      </button>
    </div>
  );
}

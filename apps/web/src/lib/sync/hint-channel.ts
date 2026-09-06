"use client";

/**
 * Hint-only realtime client for sync. Opens an SSE stream to the events
 * endpoint; each message carries a version number the engine answers with
 * its normal watermark pull. Native EventSource retry covers reconnects;
 * polling remains the fallback. Server-scoped to the session user, so hints
 * need no client-side filtering.
 */
export function subscribeToHints(onHint: () => void): () => void {
  if (typeof EventSource === "undefined") return () => {};
  const source = new EventSource("/api/sync/events");
  const handle = () => onHint();
  source.addEventListener("message", handle);
  return () => {
    source.removeEventListener("message", handle);
    source.close();
  };
}

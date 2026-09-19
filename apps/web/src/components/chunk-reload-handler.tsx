"use client";

import { useEffect } from "react";

const RELOAD_KEY = "funds-chunk-reload-at";
const RELOAD_COOLDOWN_MS = 10_000;

const CHUNK_ERROR_PATTERN = /Loading chunk \d+ failed|ChunkLoadError|Loading CSS chunk/;

export function isChunkLoadError(message: string): boolean {
  return CHUNK_ERROR_PATTERN.test(message);
}

function tryReloadOnce(): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // storage unavailable (private mode quota); fall through to the reload.
  }
  window.location.reload();
}

function messageFromReason(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) return `${reason.name} ${reason.message}`;
  return "";
}

// cavetail: deploys cut over to a new image atomically, so hashed chunks an
// open tab hasn't fetched yet 404 on the next client-side navigation. A hard
// reload fetches the fresh shell; the cooldown stops reload loops (offline).
export function ChunkReloadHandler() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = `${event.message ?? ""} ${messageFromReason(event.error)}`;
      if (isChunkLoadError(message)) {
        event.preventDefault();
        tryReloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(messageFromReason(event.reason))) {
        event.preventDefault();
        tryReloadOnce();
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}

/**
 * Hint-only realtime fanout for sync.
 *
 * Publish/subscribe is in-process per server instance. The payload is a
 * monotonic per-user version — never row data — so a hint can only ever
 * trigger the client's watermark pull, never leak or write anything.
 */
const versions = new Map<string, number>();
const subscribers = new Map<string, Set<(version: number) => void>>();

// cavetail: single VPS runs one web instance, so in-process fanout reaches
// every connection. If the deploy ever scales horizontally this map must
// become a shared bus (postgres LISTEN/NOTIFY or redis) — the publish/
// subscribe interface stays the same.
export function publishHint(userId: string): number {
  const version = (versions.get(userId) ?? 0) + 1;
  versions.set(userId, version);
  for (const cb of subscribers.get(userId) ?? []) {
    try {
      cb(version);
    } catch {
      // cavetail: one slow/broken subscriber must not break the mutation
      // response or starve the other tabs listening for the same user.
    }
  }
  return version;
}

export function subscribeHint(userId: string, cb: (version: number) => void): () => void {
  let set = subscribers.get(userId);
  if (!set) {
    set = new Set();
    subscribers.set(userId, set);
  }
  set.add(cb);
  return () => {
    set.delete(cb);
    if (set.size === 0) subscribers.delete(userId);
  };
}

export function hintVersion(userId: string): number {
  return versions.get(userId) ?? 0;
}

/** Test seam: reset hub state between tests. */
export function resetHints(): void {
  versions.clear();
  subscribers.clear();
}

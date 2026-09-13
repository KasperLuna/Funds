/**
 * cavetail: a connected-but-no-route network (dead uplink, captive portal,
 * exhausted data) hangs fetches instead of failing them — TCP SYN goes
 * unanswered with no RST, so the promise never settles. Catch-only fallbacks
 * (the SW navigation handler) then hold a white screen until the OS TCP
 * timeout, minutes later. These helpers bound every network wait so a hang
 * degrades to the same offline path as a fast failure.
 */

export function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: RequestInit | undefined,
  fetchFn: typeof fetch,
  ms: number,
): Promise<Response> {
  const ctrl = new AbortController();
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      // Abort frees the socket in real fetch impls; the explicit reject
      // below is what unblocks callers even when fetch ignores the signal
      // (e.g. test doubles).
      ctrl.abort();
      reject(new Error(`fetch timed out after ${ms}ms`));
    }, ms);
    fetchFn(input, { ...init, signal: ctrl.signal }).then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Bound a signal-less promise (e.g. the tRPC push call, which exposes no
 * abort seam). A timed-out push simply rejects here — the late resolve is
 * ignored and the outbox rows are re-pushed idempotently on the next tick.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

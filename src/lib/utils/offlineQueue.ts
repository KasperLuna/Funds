import type { Transaction } from "@/lib/types";

const STORAGE_KEY = "funds_offline_queue";

/**
 * Read the current queue from localStorage.
 */
export function getQueue(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Transaction[]) : [];
  } catch {
    return [];
  }
}

/**
 * Persist the queue to localStorage.
 */
function saveQueue(queue: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Add a transaction to the end of the offline queue.
 */
export function enqueue(transaction: Transaction): void {
  const queue = getQueue();
  queue.push(transaction);
  saveQueue(queue);
}

/**
 * Remove and return the first transaction from the queue.
 * Returns `undefined` if the queue is empty.
 */
export function dequeue(): Transaction | undefined {
  const queue = getQueue();
  if (queue.length === 0) return undefined;
  const first = queue.shift()!;
  saveQueue(queue);
  return first;
}

/**
 * Clear all queued transactions.
 */
export function clearQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Return the number of queued transactions.
 */
export function getQueueLength(): number {
  return getQueue().length;
}

/**
 * Process all queued transactions by calling `createFn` for each.
 * Successfully synced transactions are removed from the queue.
 * Failed transactions remain in the queue for a future retry.
 *
 * Returns the number of successfully synced transactions.
 */
export async function syncQueue(
  createFn: (transaction: Transaction) => Promise<unknown>,
): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  const remaining: Transaction[] = [];
  let synced = 0;

  for (const tx of queue) {
    try {
      await createFn(tx);
      synced++;
    } catch {
      remaining.push(tx);
    }
  }

  if (remaining.length > 0) {
    saveQueue(remaining);
  } else {
    clearQueue();
  }

  return synced;
}

// --- Auto-sync on reconnect ---

let onlineSyncFn: ((tx: Transaction) => Promise<unknown>) | null = null;

function handleOnline(): void {
  if (onlineSyncFn) {
    void syncQueue(onlineSyncFn);
  }
}

/**
 * Register a create function and listen for the browser `online` event
 * so queued transactions are automatically synced when connectivity returns.
 *
 * Returns a cleanup function that removes the event listener.
 */
export function listenForOnline(
  createFn: (transaction: Transaction) => Promise<unknown>,
): () => void {
  onlineSyncFn = createFn;
  window.addEventListener("online", handleOnline);
  return () => {
    window.removeEventListener("online", handleOnline);
    onlineSyncFn = null;
  };
}

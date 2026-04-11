import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Transaction } from "@/lib/types";
import {
  getQueue,
  enqueue,
  dequeue,
  clearQueue,
  getQueueLength,
  syncQueue,
  listenForOnline,
} from "./offlineQueue";

// --- Mock localStorage ---

const store: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// --- Helpers ---

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    user: "user1",
    description: "Test",
    type: "expense",
    amount: 100,
    bank: "bank1",
    categories: ["cat1"],
    date: "2024-01-15",
    ...overrides,
  };
}

describe("offlineQueue", () => {
  beforeEach(() => {
    // Clear the backing store before each test
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  // --- getQueue ---

  describe("getQueue", () => {
    it("returns an empty array when nothing is stored", () => {
      expect(getQueue()).toEqual([]);
    });

    it("returns parsed transactions from localStorage", () => {
      const tx = makeTx({ description: "Groceries" });
      store["funds_offline_queue"] = JSON.stringify([tx]);

      expect(getQueue()).toEqual([tx]);
    });

    it("returns an empty array when localStorage contains invalid JSON", () => {
      store["funds_offline_queue"] = "not-json";
      expect(getQueue()).toEqual([]);
    });
  });

  // --- enqueue ---

  describe("enqueue", () => {
    it("adds a transaction to an empty queue", () => {
      const tx = makeTx();
      enqueue(tx);

      expect(getQueue()).toEqual([tx]);
    });

    it("appends to an existing queue", () => {
      const tx1 = makeTx({ description: "First" });
      const tx2 = makeTx({ description: "Second" });
      enqueue(tx1);
      enqueue(tx2);

      expect(getQueue()).toEqual([tx1, tx2]);
    });
  });

  // --- dequeue ---

  describe("dequeue", () => {
    it("returns undefined for an empty queue", () => {
      expect(dequeue()).toBeUndefined();
    });

    it("removes and returns the first transaction", () => {
      const tx1 = makeTx({ description: "First" });
      const tx2 = makeTx({ description: "Second" });
      enqueue(tx1);
      enqueue(tx2);

      const result = dequeue();
      expect(result).toEqual(tx1);
      expect(getQueue()).toEqual([tx2]);
    });

    it("empties the queue after dequeuing the last item", () => {
      enqueue(makeTx());
      dequeue();
      expect(getQueueLength()).toBe(0);
    });
  });

  // --- clearQueue ---

  describe("clearQueue", () => {
    it("removes all queued transactions", () => {
      enqueue(makeTx());
      enqueue(makeTx());
      clearQueue();

      expect(getQueue()).toEqual([]);
    });
  });

  // --- getQueueLength ---

  describe("getQueueLength", () => {
    it("returns 0 for an empty queue", () => {
      expect(getQueueLength()).toBe(0);
    });

    it("returns the correct count", () => {
      enqueue(makeTx());
      enqueue(makeTx());
      expect(getQueueLength()).toBe(2);
    });
  });

  // --- syncQueue ---

  describe("syncQueue", () => {
    it("returns 0 when the queue is empty", async () => {
      const createFn = vi.fn();
      const synced = await syncQueue(createFn);

      expect(synced).toBe(0);
      expect(createFn).not.toHaveBeenCalled();
    });

    it("syncs all transactions and clears the queue on success", async () => {
      const tx1 = makeTx({ description: "A" });
      const tx2 = makeTx({ description: "B" });
      enqueue(tx1);
      enqueue(tx2);

      const createFn = vi.fn().mockResolvedValue({ id: "new" });
      const synced = await syncQueue(createFn);

      expect(synced).toBe(2);
      expect(createFn).toHaveBeenCalledTimes(2);
      expect(createFn).toHaveBeenCalledWith(tx1);
      expect(createFn).toHaveBeenCalledWith(tx2);
      expect(getQueueLength()).toBe(0);
    });

    it("keeps failed transactions in the queue", async () => {
      const tx1 = makeTx({ description: "OK" });
      const tx2 = makeTx({ description: "Fail" });
      const tx3 = makeTx({ description: "OK2" });
      enqueue(tx1);
      enqueue(tx2);
      enqueue(tx3);

      const createFn = vi
        .fn()
        .mockResolvedValueOnce({ id: "1" })
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ id: "3" });

      const synced = await syncQueue(createFn);

      expect(synced).toBe(2);
      expect(getQueue()).toEqual([tx2]);
    });
  });

  // --- listenForOnline ---

  describe("listenForOnline", () => {
    let addSpy: ReturnType<typeof vi.spyOn>;
    let removeSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      addSpy = vi.spyOn(window, "addEventListener");
      removeSpy = vi.spyOn(window, "removeEventListener");
    });

    afterEach(() => {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("registers an online event listener", () => {
      const createFn = vi.fn();
      listenForOnline(createFn);

      expect(addSpy).toHaveBeenCalledWith("online", expect.any(Function));
    });

    it("cleanup removes the event listener", () => {
      const createFn = vi.fn();
      const cleanup = listenForOnline(createFn);
      cleanup();

      expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    });

    it("triggers syncQueue when the online event fires", async () => {
      const tx = makeTx({ description: "Queued" });
      enqueue(tx);

      const createFn = vi.fn().mockResolvedValue({ id: "synced" });
      listenForOnline(createFn);

      // Simulate the browser going online
      window.dispatchEvent(new Event("online"));

      // Give the async sync a tick to complete
      await vi.waitFor(() => {
        expect(createFn).toHaveBeenCalledWith(tx);
      });
    });
  });
});

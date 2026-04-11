import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { usePushSubscription } from "./usePushSubscription";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscription = {
  endpoint: "https://push.example.com/sub/abc123",
  toJSON: () => ({
    endpoint: "https://push.example.com/sub/abc123",
    keys: { p256dh: "test-p256dh-key", auth: "test-auth-key" },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockSubscription),
};

const mockRegistration = {
  pushManager: mockPushManager,
};

const mockCollection = {
  getFullList: vi.fn().mockResolvedValue([]),
  create: vi
    .fn()
    .mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: "ps-new", ...data }),
    ),
  delete: vi.fn().mockResolvedValue(true),
};

vi.mock("@/lib/pocketbase/pocketbase", () => ({
  default: {
    collection: vi.fn(() => mockCollection),
    authStore: { record: { id: "u1" } },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function setupPushSupport() {
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      ready: Promise.resolve(mockRegistration),
    },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "PushManager", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
}

function removePushSupport() {
  // Delete the property entirely so "serviceWorker" in navigator returns false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).serviceWorker;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).PushManager;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("usePushSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPushManager.getSubscription.mockResolvedValue(null);
    mockCollection.getFullList.mockResolvedValue([]);
    setupPushSupport();
    vi.stubEnv(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-WO49fJqR7cooGfhHC-eNB0ly7P0yUqPmkHWkA",
    );
  });

  it("reports isSupported=true when browser supports push", () => {
    const { result } = renderHook(() => usePushSubscription(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSupported).toBe(true);
  });

  it("reports isSupported=false when browser lacks service worker", () => {
    removePushSupport();

    const { result } = renderHook(() => usePushSubscription(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSupported).toBe(false);
  });

  it("reports isSubscribed=false when no active subscription exists", async () => {
    const { result } = renderHook(() => usePushSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSubscribed).toBe(false));
  });

  it("reports isSubscribed=true when browser subscription matches stored record", async () => {
    mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
    mockCollection.getFullList.mockResolvedValue([
      {
        id: "ps1",
        user: "u1",
        endpoint: "https://push.example.com/sub/abc123",
        keys: { p256dh: "test-p256dh-key", auth: "test-auth-key" },
      },
    ]);

    const { result } = renderHook(() => usePushSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
  });

  it("subscribes to push notifications and stores in PocketBase", async () => {
    const { result } = renderHook(() => usePushSubscription(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.subscribe();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockPushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });

    expect(mockCollection.create).toHaveBeenCalledWith({
      user: "u1",
      endpoint: "https://push.example.com/sub/abc123",
      keys: { p256dh: "test-p256dh-key", auth: "test-auth-key" },
    });
  });

  it("unsubscribes from push and removes from PocketBase", async () => {
    mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
    mockCollection.getFullList.mockResolvedValue([
      {
        id: "ps1",
        user: "u1",
        endpoint: "https://push.example.com/sub/abc123",
        keys: { p256dh: "test-p256dh-key", auth: "test-auth-key" },
      },
    ]);

    const { result } = renderHook(() => usePushSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSubscribed).toBe(true));

    await act(async () => {
      result.current.unsubscribe();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    expect(mockCollection.delete).toHaveBeenCalledWith("ps1");
  });

  it("sets isLoading=true during subscribe", async () => {
    let resolveCreate: (value: unknown) => void;
    mockCollection.create.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );

    const { result } = renderHook(() => usePushSubscription(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.subscribe();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolveCreate!({
        id: "ps-new",
        user: "u1",
        endpoint: "https://push.example.com/sub/abc123",
        keys: {},
      });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlannedTransaction, PushSubscription } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetFullList = vi.fn();

vi.mock("pocketbase", () => {
  const MockPocketBase = function (this: Record<string, unknown>) {
    this.autoCancellation = vi.fn();
    this.collection = vi.fn((name: string) => ({
      getFullList: (...args: unknown[]) => mockGetFullList(name, ...args),
      create: (...args: unknown[]) => mockCreate(name, ...args),
      update: (...args: unknown[]) => mockUpdate(name, ...args),
      delete: (...args: unknown[]) => mockDelete(name, ...args),
    }));
  };
  return { default: MockPocketBase };
});

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/lib/utils/recurrence", () => ({
  calculateNextOccurrence: vi.fn().mockReturnValue(new Date("2025-02-15T00:00:00Z")),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret) {
    headers["authorization"] = `Bearer ${secret}`;
  }
  return new Request("http://localhost:3000/api/cron-planned-reminders", {
    method: "GET",
    headers,
  });
}

const basePlanned: PlannedTransaction = {
  id: "pt1",
  user: "user1",
  description: "Monthly Rent",
  type: "expense",
  amount: 1200,
  bank: "bank1",
  categories: ["cat1"],
  recurrence: { frequency: "monthly", interval: 1 },
  timezone: -5,
  previousDate: null,
  invokeDate: new Date("2025-01-15T00:00:00Z"),
  active: true,
};

const baseSub: PushSubscription = {
  id: "sub1",
  user: "user1",
  endpoint: "https://push.example.com/sub1",
  keys: { p256dh: "test-p256dh", auth: "test-auth" },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron-planned-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
  });

  it("returns 401 when CRON_SECRET is set and authorization header is missing", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when CRON_SECRET is set and authorization header is wrong", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest("wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("processes due planned transactions and returns count", async () => {
    mockGetFullList.mockImplementation((collection: string) => {
      if (collection === "planned_transactions") return [basePlanned];
      if (collection === "push_subscriptions") return [baseSub];
      return [];
    });
    mockCreate.mockResolvedValue({ id: "tx1" });
    mockUpdate.mockResolvedValue({});

    const { GET } = await import("./route");
    const response = await GET(makeRequest("test-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);

    // Verify transaction was created
    expect(mockCreate).toHaveBeenCalledWith(
      "transactions",
      expect.objectContaining({
        user: "user1",
        description: "Monthly Rent",
        type: "expense",
        amount: 1200,
        bank: "bank1",
        categories: ["cat1"],
      }),
    );

    // Verify planned transaction was updated
    expect(mockUpdate).toHaveBeenCalledWith(
      "planned_transactions",
      "pt1",
      expect.objectContaining({
        previousDate: expect.any(String),
        invokeDate: expect.any(String),
        lastNotifiedAt: expect.any(String),
      }),
    );
  });

  it("returns 0 processed when no planned transactions are due", async () => {
    mockGetFullList.mockResolvedValue([]);

    const { GET } = await import("./route");
    const response = await GET(makeRequest("test-secret"));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
  });

  it("continues processing other transactions when one fails", async () => {
    const planned2: PlannedTransaction = {
      ...basePlanned,
      id: "pt2",
      description: "Salary",
      type: "income",
    };

    mockGetFullList.mockImplementation((collection: string) => {
      if (collection === "planned_transactions") return [basePlanned, planned2];
      if (collection === "push_subscriptions") return [];
      return [];
    });

    // First create fails, second succeeds
    mockCreate.mockRejectedValueOnce(new Error("DB error")).mockResolvedValue({ id: "tx2" });
    mockUpdate.mockResolvedValue({});

    const { GET } = await import("./route");
    const response = await GET(makeRequest("test-secret"));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
  });

  it("removes invalid push subscriptions (410 Gone)", async () => {
    const webpush = await import("web-push");
    const sendNotification = vi.mocked(webpush.default.sendNotification);
    sendNotification.mockRejectedValueOnce({ statusCode: 410 });

    mockGetFullList.mockImplementation((collection: string) => {
      if (collection === "planned_transactions") return [basePlanned];
      if (collection === "push_subscriptions") return [baseSub];
      return [];
    });
    mockCreate.mockResolvedValue({ id: "tx1" });
    mockUpdate.mockResolvedValue({});
    mockDelete.mockResolvedValue({});

    const { GET } = await import("./route");
    const response = await GET(makeRequest("test-secret"));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);

    // Verify the invalid subscription was deleted
    expect(mockDelete).toHaveBeenCalledWith("push_subscriptions", "sub1");
  });
});

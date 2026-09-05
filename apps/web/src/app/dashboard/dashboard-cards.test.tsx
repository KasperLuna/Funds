// @vitest-environment jsdom
import { vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";

vi.mock("@/lib/sync/sync-context", () => ({
  useSync: vi.fn(),
}));

import { useSync } from "@/lib/sync/sync-context";
import { useSyncStore } from "@/lib/sync/sync-store";
import { ScheduledCard } from "@/components/scheduled/scheduled-card";
import { TemplateCard } from "@/components/templates/template-card";

// cavetail: jsdom lacks ResizeObserver used by radix primitives
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const mockQuery = vi.fn();

function renderCard(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSync).mockReturnValue({
    db: {
      query: mockQuery,
      watch: vi.fn(() => (async function* () {})()),
      table: vi.fn(() => ({
        upsert: vi.fn(),
        update: vi.fn(),
      })),
    } as never,
    syncStatus: {
      online: true,
      syncing: false,
      lastSyncedAt: Date.now(),
      failedCount: 0,
    },
    isReady: true,
    userId: "dev-user",
  });
  useSyncStore.setState({
    db: {
      query: mockQuery,
      watch: vi.fn(() => (async function* () {})()),
      table: vi.fn(() => ({
        upsert: vi.fn(),
        update: vi.fn(),
      })),
    } as never,
    isReady: true,
    userId: "dev-user",
  });
  mockQuery.mockResolvedValue({ rows: [] });
});

describe("ScheduledCard empty state", () => {
  it("renders the card with an empty-state message and Add button when there are no scheduled transactions", async () => {
    renderCard(<ScheduledCard accounts={[]} categories={[]} />);

    expect(await screen.findByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("No scheduled transactions yet")).toBeInTheDocument();
    expect(screen.getByText("Set up recurring entries.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});

describe("ScheduledCard attention state", () => {
  it("surfaces a due schedule as ready to log", async () => {
    const now = Date.now();
    mockQuery.mockImplementation((sql: string) =>
      Promise.resolve({
        rows: sql.includes("scheduled_transactions")
          ? [
              {
                id: "sch-due",
                user_id: "dev-user",
                name: "Rent",
                description: "Monthly rent",
                type: "expense",
                amount_minor: "150000",
                account_id: "acc-1",
                category_ids: [],
                recurrence: { frequency: "monthly", interval: 1 },
                timezone: null,
                invoke_date: now,
                previous_date: now - 86_400_000,
                last_notified_at: null,
                active: 1,
                created_at: now,
                updated_at: now,
                deleted_at: null,
              },
            ]
          : [],
      }),
    );

    renderCard(
      <ScheduledCard
        accounts={[{ id: "acc-1", name: "Checking", assetId: "ast-1", decimals: 2, code: "USD" }]}
        categories={[]}
      />,
    );

    expect(await screen.findByRole("region", { name: "Scheduled transactions needing attention" })).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("One transaction is ready to log")).toBeInTheDocument();
    expect(screen.getByText("Due")).toBeInTheDocument();
  });
});

describe("TemplateCard empty state", () => {
  it("renders the card with an empty-state message and Add button when there are no templates", async () => {
    renderCard(<TemplateCard accounts={[]} categories={[]} />);

    expect(await screen.findByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("No templates yet")).toBeInTheDocument();
    expect(screen.getByText("Create reusable transaction templates.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});

describe("ScheduledCard occurrence logging", () => {
  it("opens a prefilled log dialog on row click and advances the schedule on save", async () => {
    const user = userEvent.setup();
    const upsert = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);
    const now = Date.now();

    vi.mocked(useSync).mockReturnValue({
      db: {
        query: mockQuery,
        watch: vi.fn(() => (async function* () {})()),
        table: vi.fn(() => ({ upsert, update })),
      } as never,
      syncStatus: {
        online: true,
        syncing: false,
        lastSyncedAt: now,
        failedCount: 0,
      },
      isReady: true,
      userId: "dev-user",
    });
    useSyncStore.setState({
      db: {
        query: mockQuery,
        watch: vi.fn(() => (async function* () {})()),
        table: vi.fn(() => ({ upsert, update })),
      } as never,
      isReady: true,
      userId: "dev-user",
    });

    mockQuery.mockImplementation((sql: string) =>
      Promise.resolve({
        rows: sql.includes("scheduled_transactions")
          ? [
              {
                id: "sch-1",
                user_id: "dev-user",
                name: "Rent",
                description: "Monthly rent",
                type: "expense",
                amount_minor: "150000",
                account_id: "acc-1",
                category_ids: ["cat-1"],
                recurrence: { frequency: "monthly", interval: 1 },
                timezone: null,
                invoke_date: now,
                previous_date: null,
                last_notified_at: null,
                active: 1,
                created_at: now,
                updated_at: now,
                deleted_at: null,
              },
            ]
          : [],
      }),
    );

    renderCard(
      <ScheduledCard
        accounts={[
          { id: "acc-1", name: "Checking", assetId: "ast-1", decimals: 2, code: "USD" },
        ]}
        categories={[{ id: "cat-1", name: "Housing" }]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();

    const row = await screen.findByRole("button", { name: "Log occurrence: Rent" });
    await user.click(row);

    expect(await screen.findByText("Log transaction")).toBeInTheDocument();
    expect(screen.getByTestId("amount-readout")).toHaveTextContent("1500.00");
    expect(screen.getByLabelText("Description")).toHaveValue("Monthly rent");

    await user.click(screen.getByRole("button", { name: "5" }));
    expect(screen.getByTestId("amount-readout")).toHaveTextContent("5.00");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(upsert).toHaveBeenCalledTimes(2);
    const txnRow = upsert.mock.calls[0]![0] as Record<string, unknown>;
    expect(txnRow.account_id).toBe("acc-1");
    expect(txnRow.amount_minor).toBe(-500);
    expect(txnRow.type).toBe("expense");

    const schedRow = upsert.mock.calls[1]![0] as Record<string, unknown>;
    expect(schedRow.id).toBe("sch-1");
    expect(schedRow.previous_date).toBe(now);
    expect(schedRow.invoke_date).toBeGreaterThan(now);
  });
});

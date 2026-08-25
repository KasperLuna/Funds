// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";

vi.mock("@/lib/sync/sync-context", () => ({
  useSync: vi.fn(),
}));

import { useSync } from "@/lib/sync/sync-context";
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
      table: vi.fn(() => ({
        upsert: vi.fn(),
        update: vi.fn(),
      })),
    } as never,
    isConnected: true,
    isReady: true,
    lastSyncedAt: Date.now(),
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

describe("TemplateCard empty state", () => {
  it("renders the card with an empty-state message and Add button when there are no templates", async () => {
    renderCard(<TemplateCard accounts={[]} categories={[]} />);

    expect(await screen.findByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("No templates yet")).toBeInTheDocument();
    expect(screen.getByText("Create reusable transaction templates.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});

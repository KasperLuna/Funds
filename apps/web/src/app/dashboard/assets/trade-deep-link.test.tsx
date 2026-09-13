// @vitest-environment jsdom
// Regression: Add menu -> Trade while on the assets screen must open the
// trade sheet (same-page nav to ?tab=crypto&trade=1).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";

const navState = vi.hoisted(() => ({ search: "tab=banks", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navState.search),
  usePathname: () => "/dashboard/assets",
  useRouter: () => ({ replace: navState.replace }),
}));

vi.mock("@/lib/sync/sync-context", () => ({ useSync: vi.fn() }));
vi.mock("@/components/assets/banks-panel", () => ({
  BanksPanel: () => <div>Banks panel stub</div>,
  toAccount: (r: Record<string, unknown>) => r,
}));
vi.mock("@/components/crypto/trade-capture", () => ({
  TradeCapture: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Log trade" /> : null,
}));
vi.mock("@/lib/privacy/privacy-store", () => ({
  usePrivacyStore: (s: (x: { masked: boolean }) => unknown) => s({ masked: false }),
}));

import { useSync } from "@/lib/sync/sync-context";
import { useSyncStore } from "@/lib/sync/sync-store";
import { AssetsScreen } from "./assets-screen";

const mockQuery = vi.fn(async () => ({ rows: [] }));
function mockDb() {
  return {
    query: mockQuery,
    watch: vi.fn(() => (async function* () {})()),
    table: vi.fn(() => ({ upsert: vi.fn(), update: vi.fn() })),
  } as never;
}

function renderScreen(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  navState.search = "tab=banks";
  vi.mocked(useSync).mockReturnValue({
    db: mockDb(),
    syncStatus: { online: true, syncing: false, lastSyncedAt: 1, failedCount: 0 },
    isReady: true,
    userId: "dev-user",
  });
  useSyncStore.setState({ db: mockDb(), isReady: true, userId: "dev-user" });
});

describe("trade deep-link from assets screen", () => {
  it("opens the trade sheet after client-side nav banks -> ?tab=crypto&trade=1", async () => {
    const view = renderScreen(<AssetsScreen />);
    expect(await screen.findByText("Banks panel stub")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Log trade" })).not.toBeInTheDocument();

    // Same-page client navigation as the Add menu performs.
    navState.search = "tab=crypto&trade=1";
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AssetsScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("dialog", { name: "Log trade" })).toBeInTheDocument();
  });

  it("does nothing without the trade param", async () => {
    navState.search = "tab=crypto";
    renderScreen(<AssetsScreen />);
    await waitFor(() => expect(mockQuery).toHaveBeenCalled());
    expect(screen.queryByRole("dialog", { name: "Log trade" })).not.toBeInTheDocument();
  });
});

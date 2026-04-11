import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TokensProvider, useTokensContext } from "./TokensProvider";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockTokens = [
  {
    id: "t1",
    user: "u1",
    name: "Bitcoin",
    symbol: "BTC",
    coingecko_id: "bitcoin",
    total: 0.5,
    costAvg: 30000,
  },
  {
    id: "t2",
    user: "u1",
    name: "Ethereum",
    symbol: "ETH",
    coingecko_id: "ethereum",
    total: 10,
    costAvg: 1800,
  },
];

const mockPrices: Record<string, number> = {
  bitcoin: 60000,
  ethereum: 3000,
};

const mockFetchCryptoPrices = vi.fn().mockResolvedValue(mockPrices);

vi.mock("@/lib/utils/crypto", () => ({
  fetchCryptoPrices: (...args: unknown[]) => mockFetchCryptoPrices(...args),
  calculatePortfolioValue: (tokens: typeof mockTokens, prices: Record<string, number>) =>
    tokens.reduce((sum, t) => sum + t.total * (prices[t.coingecko_id] ?? 0), 0),
  calculatePercentageChange: (current: number, costAvg: number) =>
    costAvg === 0 ? 0 : ((current - costAvg) / costAvg) * 100,
}));

let mockUseTokensReturn = {
  data: mockTokens,
  isLoading: false,
};

vi.mock("@/lib/hooks/useTokens", () => ({
  useTokens: () => mockUseTokensReturn,
}));

vi.mock("@/lib/pocketbase/pocketbase", () => ({
  default: {
    authStore: { record: { id: "u1" } },
    collection: () => ({ getFullList: vi.fn().mockResolvedValue([]) }),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TokensProvider>{children}</TokensProvider>
    </QueryClientProvider>
  );
}

function TokensConsumer() {
  const ctx = useTokensContext();
  return (
    <div>
      <span data-testid="token-count">{ctx.tokens.length}</span>
      <span data-testid="portfolio-value">{ctx.portfolioValue}</span>
      <span data-testid="loading-tokens">{String(ctx.isLoadingTokens)}</span>
      <span data-testid="loading-prices">{String(ctx.isLoadingPrices)}</span>
      <span data-testid="btc-price">{ctx.prices["bitcoin"] ?? "none"}</span>
    </div>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TokensProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTokensReturn = { data: mockTokens, isLoading: false };
    mockFetchCryptoPrices.mockResolvedValue(mockPrices);
  });

  it("provides tokens and fetches prices", async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <TokensConsumer />
      </Wrapper>,
    );

    expect(screen.getByTestId("token-count").textContent).toBe("2");

    await waitFor(() => {
      expect(screen.getByTestId("btc-price").textContent).toBe("60000");
    });

    // portfolio = 0.5 * 60000 + 10 * 3000 = 30000 + 30000 = 60000
    expect(screen.getByTestId("portfolio-value").textContent).toBe("60000");
  });

  it("calculates portfolio value correctly", async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <TokensConsumer />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portfolio-value").textContent).toBe("60000");
    });
  });

  it("handles empty token list", async () => {
    mockUseTokensReturn = { data: [], isLoading: false };

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <TokensConsumer />
      </Wrapper>,
    );

    expect(screen.getByTestId("token-count").textContent).toBe("0");
    expect(screen.getByTestId("portfolio-value").textContent).toBe("0");
    // fetchCryptoPrices should not be called when there are no tokens
    expect(mockFetchCryptoPrices).not.toHaveBeenCalled();
  });

  it("exposes loading states", async () => {
    mockUseTokensReturn = { data: [], isLoading: true };

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <TokensConsumer />
      </Wrapper>,
    );

    expect(screen.getByTestId("loading-tokens").textContent).toBe("true");
  });

  it("throws when useTokensContext is used outside provider", () => {
    function Orphan() {
      useTokensContext();
      return null;
    }

    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow(
      "useTokensContext must be used within a TokensProvider",
    );
    spy.mockRestore();
  });
});

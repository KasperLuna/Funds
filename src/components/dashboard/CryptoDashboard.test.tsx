import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

import { CryptoDashboard } from "./CryptoDashboard";
import type { Token } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockPrivacyMode = false;

vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: (selector: (s: { privacyMode: boolean }) => boolean) =>
    selector({ privacyMode: mockPrivacyMode }),
}));

const mockTokensContext = {
  tokens: [] as Token[],
  prices: {} as Record<string, number>,
  portfolioValue: 0,
  isLoadingTokens: false,
  isLoadingPrices: false,
};

vi.mock("@/lib/providers/TokensProvider", () => ({
  useTokensContext: () => mockTokensContext,
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { currency: { symbol: "$" } },
  }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const tokens: Token[] = [
  {
    id: "t1",
    user: "u1",
    name: "Bitcoin",
    symbol: "BTC",
    coingecko_id: "bitcoin",
    total: 0.5,
    costAvg: 40000,
  },
  {
    id: "t2",
    user: "u1",
    name: "Ethereum",
    symbol: "ETH",
    coingecko_id: "ethereum",
    total: 10,
    costAvg: 2000,
  },
];

const prices: Record<string, number> = {
  bitcoin: 60000,
  ethereum: 3000,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function setContext(overrides: Partial<typeof mockTokensContext>) {
  Object.assign(mockTokensContext, {
    tokens: [],
    prices: {},
    portfolioValue: 0,
    isLoadingTokens: false,
    isLoadingPrices: false,
    ...overrides,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CryptoDashboard", () => {
  it("shows loading state while fetching tokens", () => {
    setContext({ isLoadingTokens: true });
    render(createElement(CryptoDashboard));

    expect(screen.getByText("Loading crypto data…")).toBeInTheDocument();
  });

  it("shows loading state while fetching prices", () => {
    setContext({ isLoadingPrices: true });
    render(createElement(CryptoDashboard));

    expect(screen.getByText("Loading crypto data…")).toBeInTheDocument();
  });

  it("shows empty state when no tokens exist", () => {
    setContext({ tokens: [] });
    render(createElement(CryptoDashboard));

    expect(screen.getByText(/no tokens added/i)).toBeInTheDocument();
  });

  it("displays total portfolio value with commas", () => {
    setContext({ tokens, prices, portfolioValue: 60000 });
    render(createElement(CryptoDashboard));

    expect(screen.getByText("$60,000.00")).toBeInTheDocument();
  });

  it("displays token names and symbols", () => {
    setContext({ tokens, prices, portfolioValue: 60000 });
    render(createElement(CryptoDashboard));

    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText("BTC")).toBeInTheDocument();
    expect(screen.getByText("Ethereum")).toBeInTheDocument();
    expect(screen.getByText("ETH")).toBeInTheDocument();
  });

  it("displays current value for each token with commas", () => {
    setContext({ tokens, prices, portfolioValue: 60000 });
    render(createElement(CryptoDashboard));

    // Bitcoin: 0.5 × $60000 = $30000, Ethereum: 10 × $3000 = $30000
    expect(screen.getAllByText("$30,000.00")).toHaveLength(2);
  });

  it("displays quantity × price breakdown with commas", () => {
    setContext({ tokens, prices, portfolioValue: 60000 });
    render(createElement(CryptoDashboard));

    expect(screen.getByText("0.50 × $60,000.00")).toBeInTheDocument();
    expect(screen.getByText("10.00 × $3,000.00")).toBeInTheDocument();
  });

  it("calculates and displays percentage change from costAvg", () => {
    setContext({ tokens, prices, portfolioValue: 60000 });
    render(createElement(CryptoDashboard));

    // Bitcoin: (60000 - 40000) / 40000 * 100 = 50%
    // Ethereum: (3000 - 2000) / 2000 * 100 = 50%
    expect(screen.getAllByText("+50.00%")).toHaveLength(2);
  });

  it("shows negative percentage change with red color", () => {
    const losingTokens: Token[] = [
      {
        id: "t1",
        user: "u1",
        name: "Bitcoin",
        symbol: "BTC",
        coingecko_id: "bitcoin",
        total: 1,
        costAvg: 70000,
      },
    ];
    const lowPrices = { bitcoin: 60000 };
    setContext({ tokens: losingTokens, prices: lowPrices, portfolioValue: 60000 });
    render(createElement(CryptoDashboard));

    // (60000 - 70000) / 70000 * 100 = -14.29%
    const changeEl = screen.getByText("-14.29%");
    expect(changeEl).toBeInTheDocument();
    expect(changeEl.className).toContain("text-danger");
  });

  it("shows positive percentage change with green color", () => {
    setContext({ tokens: [tokens[0]!], prices, portfolioValue: 30000 });
    render(createElement(CryptoDashboard));

    const changeEl = screen.getByText("+50.00%");
    expect(changeEl).toBeInTheDocument();
    expect(changeEl.className).toContain("text-success");
  });

  it("hides all monetary values in privacy mode", () => {
    mockPrivacyMode = true;
    setContext({ tokens, prices, portfolioValue: 60000 });
    render(createElement(CryptoDashboard));

    // Portfolio value hidden
    expect(screen.queryByText("$60,000.00")).not.toBeInTheDocument();
    // Token values hidden
    expect(screen.queryByText("$30,000.00")).not.toBeInTheDocument();
    // Percentage hidden
    expect(screen.queryByText("+50.00%")).not.toBeInTheDocument();

    // Privacy masks shown: portfolio value (1) + per token: value (1) + breakdown (1) + percentage (1) = 3 per token
    // Total: 1 + 3*2 = 7
    expect(screen.getAllByText("●●●●")).toHaveLength(7);

    // Token names still visible
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText("Ethereum")).toBeInTheDocument();

    mockPrivacyMode = false;
  });
});

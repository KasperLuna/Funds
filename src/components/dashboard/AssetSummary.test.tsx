import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

import { AssetSummary } from "./AssetSummary";

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockPrivacyMode = false;

vi.mock("@/lib/stores/useUIStore", () => ({
  useUIStore: (selector: (s: { privacyMode: boolean }) => boolean) =>
    selector({ privacyMode: mockPrivacyMode }),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { currency: { symbol: "$" } },
  }),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AssetSummary", () => {
  it("displays total assets as sum of bank and crypto totals", () => {
    render(createElement(AssetSummary, { bankTotal: 5000, cryptoTotal: 3000 }));

    expect(screen.getByTestId("total-assets")).toHaveTextContent("$8,000.00");
  });

  it("displays bank total breakdown", () => {
    render(createElement(AssetSummary, { bankTotal: 5000, cryptoTotal: 3000 }));

    expect(screen.getByTestId("bank-total")).toHaveTextContent("$5,000.00");
  });

  it("displays crypto total breakdown", () => {
    render(createElement(AssetSummary, { bankTotal: 5000, cryptoTotal: 3000 }));

    expect(screen.getByTestId("crypto-total")).toHaveTextContent("$3,000.00");
  });

  it("handles zero values", () => {
    render(createElement(AssetSummary, { bankTotal: 0, cryptoTotal: 0 }));

    expect(screen.getByTestId("total-assets")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("bank-total")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("crypto-total")).toHaveTextContent("$0.00");
  });

  it("hides all amounts in privacy mode", () => {
    mockPrivacyMode = true;
    render(createElement(AssetSummary, { bankTotal: 5000, cryptoTotal: 3000 }));

    expect(screen.getAllByText("●●●●")).toHaveLength(3);
    expect(screen.queryByText("$8,000.00")).not.toBeInTheDocument();
    expect(screen.queryByText("$5,000.00")).not.toBeInTheDocument();
    expect(screen.queryByText("$3,000.00")).not.toBeInTheDocument();

    mockPrivacyMode = false;
  });

  it("still shows labels in privacy mode", () => {
    mockPrivacyMode = true;
    render(createElement(AssetSummary, { bankTotal: 5000, cryptoTotal: 3000 }));

    expect(screen.getByText("Total Assets")).toBeInTheDocument();
    expect(screen.getByText("Bank Accounts")).toBeInTheDocument();
    expect(screen.getByText("Crypto Portfolio")).toBeInTheDocument();

    mockPrivacyMode = false;
  });
});

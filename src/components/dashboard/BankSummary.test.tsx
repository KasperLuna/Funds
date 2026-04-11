import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

import { BankSummary } from "./BankSummary";
import type { Bank } from "@/lib/types";

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

// ── Fixtures ─────────────────────────────────────────────────────────────────

const banks: Bank[] = [
  { id: "b1", user: "u1", name: "Checking", balance: 2500, primaryColor: "#3b82f6" },
  { id: "b2", user: "u1", name: "Savings", balance: 10000, primaryColor: "#22c55e" },
  { id: "b3", user: "u1", name: "Credit Card", balance: -500 },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("BankSummary", () => {
  it("renders all bank names", () => {
    render(createElement(BankSummary, { banks }));

    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Credit Card")).toBeInTheDocument();
  });

  it("displays balance for each bank with commas", () => {
    render(createElement(BankSummary, { banks }));

    expect(screen.getByTestId("bank-balance-b1")).toHaveTextContent("$2,500.00");
    expect(screen.getByTestId("bank-balance-b2")).toHaveTextContent("$10,000.00");
    expect(screen.getByTestId("bank-balance-b3")).toHaveTextContent("-$500.00");
  });

  it("sorts banks by absolute balance descending", () => {
    const { container } = render(createElement(BankSummary, { banks }));

    const testIds = Array.from(container.querySelectorAll("[data-testid^='bank-balance-']")).map(
      (el) => el.getAttribute("data-testid"),
    );
    // Savings (10000) > Checking (2500) > Credit Card (500)
    expect(testIds).toEqual(["bank-balance-b2", "bank-balance-b1", "bank-balance-b3"]);
  });

  it("renders responsive layout", () => {
    const { container } = render(createElement(BankSummary, { banks }));

    const grid = container.firstElementChild;
    expect(grid).toBeInTheDocument();
    expect(grid?.className).toContain("sm:grid-cols-2");
    expect(grid?.className).toContain("lg:grid-cols-3");
  });

  it("shows empty state when no banks exist", () => {
    render(createElement(BankSummary, { banks: [] }));

    expect(screen.getByText(/no bank accounts yet/i)).toBeInTheDocument();
  });

  it("hides balances in privacy mode", () => {
    mockPrivacyMode = true;
    render(createElement(BankSummary, { banks }));

    expect(screen.getAllByText("●●●●")).toHaveLength(3);
    expect(screen.queryByText("$2,500.00")).not.toBeInTheDocument();
    expect(screen.queryByText("$10,000.00")).not.toBeInTheDocument();

    mockPrivacyMode = false;
  });

  it("still shows bank names in privacy mode", () => {
    mockPrivacyMode = true;
    render(createElement(BankSummary, { banks }));

    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Credit Card")).toBeInTheDocument();

    mockPrivacyMode = false;
  });

  it("applies primary color as tinted background", () => {
    const { container } = render(createElement(BankSummary, { banks: [banks[0]!] }));

    const bankCard = container.querySelector("[style]");
    expect(bankCard).toBeInTheDocument();
    expect(bankCard?.getAttribute("style")).toContain("color-mix");
  });
});

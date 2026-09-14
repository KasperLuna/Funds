// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { monthHeatmap, monthHighlights, txnsByAccount } from "@/lib/analytics/compute";
import { AccountActivityCard } from "./account-activity-card";
import { ActivityHeatmapCard } from "./activity-heatmap-card";
import { MonthHighlightsCard } from "./month-highlights-card";
import { SavingsRateCard } from "./savings-rate-card";

const INFO = {
  "acc-1": { code: "PHP", decimals: 2 },
  "acc-2": { code: "PHP", decimals: 2 },
};

function janTxns() {
  return [
    {
      id: "t1", accountId: "acc-1", assetId: "a", amountMinor: -1000n,
      type: "expense", description: "", categoryIds: [], date: new Date(2026, 0, 3).getTime(),
    },
    {
      id: "t2", accountId: "acc-1", assetId: "a", amountMinor: -500n,
      type: "expense", description: "", categoryIds: [], date: new Date(2026, 0, 3).getTime(),
    },
    {
      id: "t3", accountId: "acc-2", assetId: "a", amountMinor: 9000n,
      type: "income", description: "", categoryIds: [], date: new Date(2026, 0, 8).getTime(),
    },
  ] as never;
}

const ACCOUNTS = [
  { id: "acc-1", name: "Checking" },
  { id: "acc-2", name: "Wallet" },
];

beforeEach(() => {
  usePrivacyStore.setState({ masked: false });
});

describe("AccountActivityCard", () => {
  it("renders per-account counts, flows, and the top-inflow star", () => {
    const data = txnsByAccount(janTxns(), ACCOUNTS, [], 2026, 0);
    render(
      <AccountActivityCard
        data={data}
        accountInfo={INFO}
        topInflowAccountId="acc-2"
        monthLabel="Jan 2026"
      />,
    );
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("2 txns")).toBeInTheDocument();
    expect(screen.getByText("1 txn")).toBeInTheDocument();
    const walletRow = screen.getByText("Wallet").closest("li")!;
    expect(within(walletRow).getByLabelText("Top income account")).toBeInTheDocument();
  });

  it("masks money under privacy but keeps counts", () => {
    usePrivacyStore.setState({ masked: true });
    const data = txnsByAccount(janTxns(), ACCOUNTS, [], 2026, 0);
    render(<AccountActivityCard data={data} accountInfo={INFO} topInflowAccountId={null} />);
    expect(screen.getByText("2 txns")).toBeInTheDocument();
    expect(screen.getAllByText("••••").length).toBeGreaterThan(0);
  });

  it("renders the empty state", () => {
    render(<AccountActivityCard data={[]} accountInfo={{}} topInflowAccountId={null} />);
    expect(screen.getByText("No transactions this month")).toBeInTheDocument();
  });
});

describe("ActivityHeatmapCard", () => {
  it("renders weekday-aligned cells with counts", () => {
    const heat = monthHeatmap(janTxns(), [], 2026, 0);
    render(<ActivityHeatmapCard months={[heat]} code="PHP" />);
    const grid = screen.getByRole("grid", { name: /Daily activity/ });
    // Day cells only — leading blanks are aria-hidden spacers.
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(31);
    expect(
      screen.getByRole("gridcell", { name: /Jan 2026 3: 2 transactions/ }),
    ).toHaveTextContent("3");
  });

  it("sizes February grids by leap year", () => {
    const heat = monthHeatmap([], [], 2024, 1);
    render(<ActivityHeatmapCard months={[heat]} />);
    const grid = screen.getByRole("grid", { name: /Daily activity/ });
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(29);
  });
});

describe("MonthHighlightsCard", () => {
  it("renders all four stats", () => {
    const data = monthHighlights(janTxns(), [], 2026, 0);
    render(<MonthHighlightsCard data={data} year={2026} month={0} code="PHP" />);
    expect(screen.getByText("Busiest day")).toBeInTheDocument();
    expect(screen.getByText(/Jan 3 · 2 txns/)).toBeInTheDocument();
    expect(screen.getByText("Longest streak")).toBeInTheDocument();
    expect(screen.getByText("Busiest weekday")).toBeInTheDocument();
  });

  it("masks the biggest-outflow amount under privacy", () => {
    usePrivacyStore.setState({ masked: true });
    const data = monthHighlights(janTxns(), [], 2026, 0);
    render(<MonthHighlightsCard data={data} year={2026} month={0} code="PHP" />);
    expect(screen.getByText(/Jan 3 · ••••/)).toBeInTheDocument();
  });
});

describe("SavingsRateCard period", () => {
  it("switches window via segmented control, headline stays on latest", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const data = [
      { month: "Jan", rate: 10 },
      { month: "Feb", rate: 20 },
      { month: "Mar", rate: 30 },
    ];
    const { rerender } = render(
      <SavingsRateCard data={data} window={6} onWindowChange={onChange} />,
    );
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "6M" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "3M" }));
    expect(onChange).toHaveBeenCalledWith(3);
    rerender(<SavingsRateCard data={data.slice(-1)} window={3} onWindowChange={onChange} />);
    expect(screen.getByText("30%")).toBeInTheDocument();
  });
});

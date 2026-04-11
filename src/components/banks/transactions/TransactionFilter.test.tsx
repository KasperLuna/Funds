import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionFilter } from "./TransactionFilter";
import type { Bank, Category, TransactionFilters } from "@/lib/types";

const mockBanks: Bank[] = [
  { id: "b1", user: "u1", name: "Chase", balance: 1000 },
  { id: "b2", user: "u1", name: "Wells Fargo", balance: 2000 },
];

const mockCategories: Category[] = [
  { id: "c1", user: "u1", name: "Food", hideable: false },
  { id: "c2", user: "u1", name: "Rent", hideable: false },
];

describe("TransactionFilter", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders all filter controls", () => {
    render(<TransactionFilter banks={mockBanks} categories={mockCategories} onChange={onChange} />);

    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByLabelText("Bank")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by categories")).toBeInTheDocument();
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();
  });

  it("renders category checkboxes for each category", () => {
    render(<TransactionFilter banks={mockBanks} categories={mockCategories} onChange={onChange} />);

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
  });

  it("debounces search input by 300ms", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TransactionFilter banks={mockBanks} categories={mockCategories} onChange={onChange} />);

    // Clear initial onChange call
    onChange.mockClear();

    const searchInput = screen.getByLabelText("Search");
    await user.type(searchInput, "grocery");

    // Should not have called onChange with searchText yet (debounce pending)
    const callsWithSearch = onChange.mock.calls.filter(
      (call: [TransactionFilters]) => call[0].searchText,
    );
    expect(callsWithSearch.length).toBe(0);

    // Advance past debounce
    vi.advanceTimersByTime(300);

    const callsAfterDebounce = onChange.mock.calls.filter(
      (call: [TransactionFilters]) => call[0].searchText === "grocery",
    );
    expect(callsAfterDebounce.length).toBe(1);
  });

  it("calls onChange with selected category", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TransactionFilter banks={mockBanks} categories={mockCategories} onChange={onChange} />);

    onChange.mockClear();

    const foodCheckbox = screen.getByRole("checkbox", { name: /food/i });
    await user.click(foodCheckbox);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1] as [TransactionFilters];
    expect(lastCall[0].categories).toEqual(["c1"]);
  });

  it("calls onChange with date range when dates are set", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TransactionFilter banks={mockBanks} categories={mockCategories} onChange={onChange} />);

    onChange.mockClear();

    const startInput = screen.getByLabelText("Start Date");
    await user.type(startInput, "2024-01-01");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1] as [TransactionFilters];
    expect(lastCall[0].dateRange).toBeDefined();
    expect(lastCall[0].dateRange!.start).toEqual(new Date("2024-01-01"));
  });

  it("emits empty filters when all set to defaults", () => {
    render(<TransactionFilter banks={mockBanks} categories={mockCategories} onChange={onChange} />);

    // Initial call should have empty filters (all defaults)
    const initialCall = onChange.mock.calls[0] as [TransactionFilters];
    expect(initialCall[0]).toEqual({});
  });

  it("has accessible search region", () => {
    render(<TransactionFilter banks={mockBanks} categories={mockCategories} onChange={onChange} />);

    expect(screen.getByRole("search", { name: /transaction filters/i })).toBeInTheDocument();
  });
});

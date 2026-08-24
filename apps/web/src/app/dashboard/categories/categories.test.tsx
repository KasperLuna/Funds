// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/categories/categories-store";
import { PrivacyProvider } from "@/lib/privacy/privacy-context";

vi.mock("@/lib/sync/sync-context", () => ({
  useSync: vi.fn(),
}));

import { useSync } from "@/lib/sync/sync-context";
import CategoriesPage from "./page";

const mockQuery = vi.fn();
const mockExecute = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSync).mockReturnValue({
    db: {
      query: mockQuery,
      execute: mockExecute,
      table: vi.fn(() => ({
        upsert: vi.fn(),
        update: vi.fn(),
        deleteById: vi.fn(),
      })),
    } as never,
    isConnected: true,
    lastSyncedAt: Date.now(),
    userId: "dev-user",
  });
  mockQuery.mockResolvedValue({ rows: [] });
});

describe("CategoriesPage", () => {
  it("renders empty state when no categories", async () => {
    render(<CategoriesPage />);
    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("No categories yet")).toBeInTheDocument();
  });

  it("renders categories when loaded", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "cat-1",
          name: "Food",
          color: "#6366f1",
          hideable: false,
          monthly_budget_minor: null,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        },
        {
          id: "cat-2",
          name: "Transport",
          color: "#22c55e",
          hideable: false,
          monthly_budget_minor: null,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        },
      ],
    });

    render(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Transport")).toBeInTheDocument();
    });
  });

  it("opens new category dialog when clicking New category", async () => {
    render(<CategoriesPage />);
    const newButton = screen.getByRole("button", { name: /new category/i });
    fireEvent.click(newButton);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Color" })).toBeInTheDocument();
  });

  it("renders color picker with default colors", async () => {
    render(<CategoriesPage />);
    fireEvent.click(screen.getByRole("button", { name: /new category/i }));
    
    const colorGroup = screen.getByRole("radiogroup", { name: "Color" });
    expect(colorGroup).toBeInTheDocument();
    
    const colorButtons = screen.getAllByRole("radio");
    expect(colorButtons.length).toBe(DEFAULT_CATEGORY_COLORS.length);
  });

  it("offers prev/next quick-selectors around the budget month dropdown", async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "cat-1",
          name: "Food",
          color: "#6366f1",
          hideable: false,
          monthly_budget_minor: 100000,
          asset_id: "ast-1",
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        },
      ],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // transactions
    mockQuery.mockResolvedValueOnce({ rows: [] }); // accounts
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "budget-1",
          category_id: "cat-1",
          asset_id: "ast-1",
          month_start: monthStart,
          amount_minor: 100000,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        },
      ],
    });

    render(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Budget month" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Previous month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeInTheDocument();
  });

  it("shows the usage percentage regardless of privacy mode", async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "cat-1",
          name: "Food",
          color: "#6366f1",
          hideable: false,
          monthly_budget_minor: 100000,
          asset_id: "ast-1",
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        },
      ],
    });
    // One transaction spending $45,000 against the $100,000 budget → 45%.
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "txn-1",
          account_id: "acc-1",
          asset_id: "ast-1",
          amount_minor: -45000,
          type: "expense",
          description: "Groceries",
          category_ids: ["cat-1"],
          date: now.getTime(),
          deleted_at: null,
        },
      ],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // accounts
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "budget-1",
          category_id: "cat-1",
          asset_id: "ast-1",
          month_start: monthStart,
          amount_minor: 100000,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        },
      ],
    });

    const { unmount } = render(
      <PrivacyProvider initialMasked>
        <CategoriesPage />
      </PrivacyProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("45%")).toBeInTheDocument();
    });
    // Masked: percentage shown, money amounts hidden.
    expect(screen.queryByText(/450\.00/)).not.toBeInTheDocument();
    unmount();

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "cat-1",
          name: "Food",
          color: "#6366f1",
          hideable: false,
          monthly_budget_minor: 100000,
          asset_id: "ast-1",
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        },
      ],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "txn-1",
          account_id: "acc-1",
          asset_id: "ast-1",
          amount_minor: -45000,
          type: "expense",
          description: "Groceries",
          category_ids: ["cat-1"],
          date: now.getTime(),
          deleted_at: null,
        },
      ],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // accounts
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "budget-1",
          category_id: "cat-1",
          asset_id: "ast-1",
          month_start: monthStart,
          amount_minor: 100000,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        },
      ],
    });

    render(
      <PrivacyProvider initialMasked={false}>
        <CategoriesPage />
      </PrivacyProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText(/· 45%/)).toBeInTheDocument();
    });
  });
});

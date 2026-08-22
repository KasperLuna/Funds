// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/categories/categories-store";

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
    } as never,
    isConnected: true,
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
});

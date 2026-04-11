import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TransactionForm } from "./TransactionForm";
import type { Bank, Category, Transaction } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = vi.fn().mockResolvedValue({ id: "tx-new" });
const mockUpdate = vi.fn().mockResolvedValue({ id: "tx-1" });

const mockCollection = {
  getFullList: vi.fn().mockResolvedValue([]),
  create: mockCreate,
  update: mockUpdate,
  delete: vi.fn(),
};

vi.mock("@/lib/pocketbase/pocketbase", () => ({
  default: {
    collection: vi.fn(() => mockCollection),
    authStore: { record: { id: "u1" } },
  },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const banks: Bank[] = [
  { id: "b1", user: "u1", name: "Checking", balance: 1000 },
  { id: "b2", user: "u1", name: "Savings", balance: 5000 },
];

const categories: Category[] = [
  { id: "c1", user: "u1", name: "Food", hideable: false },
  { id: "c2", user: "u1", name: "Transport", hideable: false },
  { id: "c3", user: "u1", name: "Entertainment", hideable: true },
];

const editTransaction: Transaction = {
  id: "tx-1",
  user: "u1",
  description: "Grocery shopping",
  type: "expense",
  amount: 42.5,
  bank: "b1",
  categories: ["c1"],
  date: "2024-06-15T00:00:00.000Z",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function renderForm(props: Partial<Parameters<typeof TransactionForm>[0]> = {}) {
  return render(
    createElement(TransactionForm, {
      banks,
      categories,
      ...props,
    }),
    { wrapper: createWrapper() },
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TransactionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create mode with default values", () => {
    renderForm();

    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(screen.getByLabelText("Amount")).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Create Transaction" })).toBeInTheDocument();
  });

  it("renders edit mode with initial data", () => {
    renderForm({ initialData: editTransaction });

    expect(screen.getByLabelText("Description")).toHaveValue("Grocery shopping");
    expect(screen.getByLabelText("Amount")).toHaveValue(42.5);
    expect(screen.getByRole("button", { name: "Update Transaction" })).toBeInTheDocument();
  });

  it("shows validation error when description is empty", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() => {
      expect(screen.getByText("Description is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("shows validation error when no category is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    // Fill required fields except categories
    await user.type(screen.getByLabelText("Description"), "Test");
    await user.type(screen.getByLabelText("Amount"), "10");

    await user.click(screen.getByRole("button", { name: "Create Transaction" }));

    await waitFor(() => {
      expect(screen.getByText("At least one category is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("renders all category checkboxes", () => {
    renderForm();

    expect(screen.getByLabelText("Food")).toBeInTheDocument();
    expect(screen.getByLabelText("Transport")).toBeInTheDocument();
    expect(screen.getByLabelText("Entertainment")).toBeInTheDocument();
  });

  it("allows selecting multiple categories", async () => {
    const user = userEvent.setup();
    renderForm();

    const foodCheckbox = screen.getByLabelText("Food");
    const transportCheckbox = screen.getByLabelText("Transport");

    await user.click(foodCheckbox);
    await user.click(transportCheckbox);

    expect(foodCheckbox).toBeChecked();
    expect(transportCheckbox).toBeChecked();
  });

  it("pre-checks categories in edit mode", () => {
    renderForm({ initialData: editTransaction });

    expect(screen.getByLabelText("Food")).toBeChecked();
    expect(screen.getByLabelText("Transport")).not.toBeChecked();
  });

  it("renders date input", () => {
    renderForm();

    expect(screen.getByLabelText("Date")).toHaveAttribute("type", "date");
  });

  it("disables submit button during submission", async () => {
    // Make update hang so we can check disabled state
    mockUpdate.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderForm({ initialData: editTransaction });

    await user.click(screen.getByRole("button", { name: "Update Transaction" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Updating…" })).toBeDisabled();
    });
  });
});

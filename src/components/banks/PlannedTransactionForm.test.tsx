import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PlannedTransactionForm } from "./PlannedTransactionForm";
import type { Bank, Category, PlannedTransaction } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = vi.fn().mockResolvedValue({ id: "pt-new" });
const mockUpdate = vi.fn().mockResolvedValue({ id: "pt-1" });

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
];

const editPlanned: PlannedTransaction = {
  id: "pt-1",
  user: "u1",
  description: "Monthly rent",
  type: "expense",
  amount: 1200,
  bank: "b1",
  categories: ["c1"],
  recurrence: { frequency: "monthly", interval: 1 },
  timezone: -5,
  previousDate: null,
  invokeDate: new Date(),
  active: true,
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

function renderForm(props: Partial<Parameters<typeof PlannedTransactionForm>[0]> = {}) {
  return render(
    createElement(PlannedTransactionForm, {
      banks,
      categories,
      ...props,
    }),
    { wrapper: createWrapper() },
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PlannedTransactionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create mode with default values", () => {
    renderForm();

    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(screen.getByLabelText("Amount")).toHaveValue(null);
    expect(screen.getByLabelText("Interval")).toHaveValue(1);
    expect(screen.getByLabelText("Timezone (UTC offset)")).toHaveValue(0);
    expect(screen.getByRole("button", { name: "Create Planned Transaction" })).toBeInTheDocument();
  });

  it("renders edit mode with initial data", () => {
    renderForm({ initialData: editPlanned });

    expect(screen.getByLabelText("Description")).toHaveValue("Monthly rent");
    expect(screen.getByLabelText("Amount")).toHaveValue(1200);
    expect(screen.getByLabelText("Interval")).toHaveValue(1);
    expect(screen.getByLabelText("Timezone (UTC offset)")).toHaveValue(-5);
    expect(screen.getByRole("button", { name: "Update Planned Transaction" })).toBeInTheDocument();
  });

  it("shows validation error when description is empty", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Create Planned Transaction" }));

    await waitFor(() => {
      expect(screen.getByText("Description is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("shows validation error when no category is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Description"), "Test");
    await user.type(screen.getByLabelText("Amount"), "10");

    await user.click(screen.getByRole("button", { name: "Create Planned Transaction" }));

    await waitFor(() => {
      expect(screen.getByText("At least one category is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("renders all category checkboxes", () => {
    renderForm();

    expect(screen.getByLabelText("Food")).toBeInTheDocument();
    expect(screen.getByLabelText("Transport")).toBeInTheDocument();
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
    renderForm({ initialData: editPlanned });

    expect(screen.getByLabelText("Food")).toBeChecked();
    expect(screen.getByLabelText("Transport")).not.toBeChecked();
  });

  it("renders frequency and interval fields", () => {
    renderForm();

    expect(screen.getByLabelText("Frequency")).toBeInTheDocument();
    expect(screen.getByLabelText("Interval")).toBeInTheDocument();
  });

  it("renders timezone field", () => {
    renderForm();

    expect(screen.getByLabelText("Timezone (UTC offset)")).toHaveAttribute("type", "number");
  });

  it("disables submit button during submission", async () => {
    mockUpdate.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderForm({ initialData: editPlanned });

    await user.click(screen.getByRole("button", { name: "Update Planned Transaction" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Updating…" })).toBeDisabled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CategoryForm } from "./CategoryForm";
import type { Category } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = vi.fn().mockResolvedValue({ id: "c-new", name: "Test" });
const mockUpdate = vi.fn().mockResolvedValue({ id: "c1", name: "Updated" });

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

const editCategory: Category = {
  id: "c1",
  user: "u1",
  name: "Groceries",
  hideable: true,
  total_exempt: false,
  monthly_budget: 500,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CategoryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create mode with default values", () => {
    render(createElement(CategoryForm), { wrapper: createWrapper() });

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Monthly Budget")).toHaveValue(null);
    expect(screen.getByLabelText("Hideable")).not.toBeChecked();
    expect(screen.getByLabelText("Total Exempt")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Create Category" })).toBeInTheDocument();
  });

  it("renders edit mode with initial data", () => {
    render(createElement(CategoryForm, { initialData: editCategory }), {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText("Name")).toHaveValue("Groceries");
    expect(screen.getByLabelText("Monthly Budget")).toHaveValue(500);
    expect(screen.getByLabelText("Hideable")).toBeChecked();
    expect(screen.getByLabelText("Total Exempt")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Update Category" })).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    render(createElement(CategoryForm), { wrapper: createWrapper() });

    await user.click(screen.getByRole("button", { name: "Create Category" }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls create mutation on submit in create mode", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(createElement(CategoryForm, { onSuccess }), { wrapper: createWrapper() });

    await user.type(screen.getByLabelText("Name"), "Food");
    await user.click(screen.getByRole("button", { name: "Create Category" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Food", hideable: false, user: "u1" }),
      );
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("calls update mutation on submit in edit mode", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(createElement(CategoryForm, { initialData: editCategory, onSuccess }), {
      wrapper: createWrapper(),
    });

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Groceries");
    await user.click(screen.getByRole("button", { name: "Update Category" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({ name: "Updated Groceries" }),
      );
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("resets form after successful create", async () => {
    const user = userEvent.setup();
    render(createElement(CategoryForm), { wrapper: createWrapper() });

    await user.type(screen.getByLabelText("Name"), "Food");
    await user.click(screen.getByRole("button", { name: "Create Category" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("");
    });
  });

  it("supports checkbox fields for hideable and total_exempt", async () => {
    const user = userEvent.setup();
    render(createElement(CategoryForm), { wrapper: createWrapper() });

    const hideableCheckbox = screen.getByLabelText("Hideable");
    const totalExemptCheckbox = screen.getByLabelText("Total Exempt");

    await user.click(hideableCheckbox);
    await user.click(totalExemptCheckbox);

    expect(hideableCheckbox).toBeChecked();
    expect(totalExemptCheckbox).toBeChecked();
  });

  it("disables submit button while submitting", async () => {
    mockCreate.mockImplementation(() => new Promise(() => {})); // never resolves
    const user = userEvent.setup();
    render(createElement(CategoryForm), { wrapper: createWrapper() });

    await user.type(screen.getByLabelText("Name"), "Food");
    await user.click(screen.getByRole("button", { name: "Create Category" }));

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });
});

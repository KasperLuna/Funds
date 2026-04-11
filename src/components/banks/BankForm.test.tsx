import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { BankForm } from "./BankForm";
import type { Bank } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = vi.fn().mockResolvedValue({ id: "b-new", name: "Test" });
const mockUpdate = vi.fn().mockResolvedValue({ id: "b1", name: "Updated" });

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

const editBank: Bank = {
  id: "b1",
  user: "u1",
  name: "Checking",
  balance: 1000,
  primaryColor: "#0000ff",
  secondaryColor: "#ffffff",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("BankForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create mode with default values", () => {
    render(createElement(BankForm), { wrapper: createWrapper() });

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create Bank" })).toBeInTheDocument();
  });

  it("renders edit mode with initial data", () => {
    render(createElement(BankForm, { initialData: editBank }), { wrapper: createWrapper() });

    expect(screen.getByLabelText("Name")).toHaveValue("Checking");
    expect(screen.getByRole("button", { name: "Update Bank" })).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    render(createElement(BankForm), { wrapper: createWrapper() });

    await user.click(screen.getByRole("button", { name: "Create Bank" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls create mutation on submit in create mode", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(createElement(BankForm, { onSuccess }), { wrapper: createWrapper() });

    await user.type(screen.getByLabelText("Name"), "New Bank");
    await user.click(screen.getByRole("button", { name: "Create Bank" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Bank", user: "u1", balance: 0 }),
      );
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("calls update mutation on submit in edit mode", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(createElement(BankForm, { initialData: editBank, onSuccess }), {
      wrapper: createWrapper(),
    });

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Checking");
    await user.click(screen.getByRole("button", { name: "Update Bank" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "b1",
        expect.objectContaining({ name: "Updated Checking" }),
      );
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("resets form after successful create", async () => {
    const user = userEvent.setup();
    render(createElement(BankForm), { wrapper: createWrapper() });

    await user.type(screen.getByLabelText("Name"), "New Bank");
    await user.click(screen.getByRole("button", { name: "Create Bank" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("");
    });
  });

  it("renders color inputs", () => {
    render(createElement(BankForm), { wrapper: createWrapper() });

    expect(screen.getByLabelText("Primary Color")).toHaveAttribute("type", "color");
    expect(screen.getByLabelText("Secondary Color")).toHaveAttribute("type", "color");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TokenForm } from "./TokenForm";
import type { Token } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = vi.fn().mockResolvedValue({ id: "t-new", name: "Bitcoin" });
const mockUpdate = vi.fn().mockResolvedValue({ id: "t1", name: "Bitcoin" });

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

const editToken: Token = {
  id: "t1",
  user: "u1",
  name: "Bitcoin",
  symbol: "BTC",
  coingecko_id: "bitcoin",
  total: 1.5,
  costAvg: 30000,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TokenForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create mode with default values", () => {
    render(createElement(TokenForm), { wrapper: createWrapper() });

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Symbol")).toHaveValue("");
    expect(screen.getByLabelText("CoinGecko ID")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create Token" })).toBeInTheDocument();
  });

  it("renders edit mode with initial data", () => {
    render(createElement(TokenForm, { initialData: editToken }), { wrapper: createWrapper() });

    expect(screen.getByLabelText("Name")).toHaveValue("Bitcoin");
    expect(screen.getByLabelText("Symbol")).toHaveValue("BTC");
    expect(screen.getByLabelText("CoinGecko ID")).toHaveValue("bitcoin");
    expect(screen.getByRole("button", { name: "Update Token" })).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    render(createElement(TokenForm), { wrapper: createWrapper() });

    // Fill other required fields but leave name empty
    await user.type(screen.getByLabelText("Symbol"), "BTC");
    await user.type(screen.getByLabelText("CoinGecko ID"), "bitcoin");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "1");
    await user.clear(screen.getByLabelText("Cost Average"));
    await user.type(screen.getByLabelText("Cost Average"), "100");
    await user.click(screen.getByRole("button", { name: "Create Token" }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("shows validation error when symbol is empty", async () => {
    const user = userEvent.setup();
    render(createElement(TokenForm), { wrapper: createWrapper() });

    await user.type(screen.getByLabelText("Name"), "Bitcoin");
    await user.type(screen.getByLabelText("CoinGecko ID"), "bitcoin");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "1");
    await user.clear(screen.getByLabelText("Cost Average"));
    await user.type(screen.getByLabelText("Cost Average"), "100");
    await user.click(screen.getByRole("button", { name: "Create Token" }));

    await waitFor(() => {
      expect(screen.getByText("Symbol is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("shows validation error when coingecko_id is empty", async () => {
    const user = userEvent.setup();
    render(createElement(TokenForm), { wrapper: createWrapper() });

    await user.type(screen.getByLabelText("Name"), "Bitcoin");
    await user.type(screen.getByLabelText("Symbol"), "BTC");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "1");
    await user.clear(screen.getByLabelText("Cost Average"));
    await user.type(screen.getByLabelText("Cost Average"), "100");
    await user.click(screen.getByRole("button", { name: "Create Token" }));

    await waitFor(() => {
      expect(screen.getByText("CoinGecko ID is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls create mutation on submit in create mode", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(createElement(TokenForm, { onSuccess }), { wrapper: createWrapper() });

    await user.type(screen.getByLabelText("Name"), "Bitcoin");
    await user.type(screen.getByLabelText("Symbol"), "BTC");
    await user.type(screen.getByLabelText("CoinGecko ID"), "bitcoin");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "1.5");
    await user.clear(screen.getByLabelText("Cost Average"));
    await user.type(screen.getByLabelText("Cost Average"), "30000");
    await user.click(screen.getByRole("button", { name: "Create Token" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Bitcoin",
          symbol: "BTC",
          coingecko_id: "bitcoin",
          total: 1.5,
          costAvg: 30000,
          user: "u1",
        }),
      );
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("calls update mutation on submit in edit mode", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(createElement(TokenForm, { initialData: editToken, onSuccess }), {
      wrapper: createWrapper(),
    });

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Ethereum");
    await user.click(screen.getByRole("button", { name: "Update Token" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("t1", expect.objectContaining({ name: "Ethereum" }));
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("resets form after successful create", async () => {
    const user = userEvent.setup();
    render(createElement(TokenForm), { wrapper: createWrapper() });

    await user.type(screen.getByLabelText("Name"), "Bitcoin");
    await user.type(screen.getByLabelText("Symbol"), "BTC");
    await user.type(screen.getByLabelText("CoinGecko ID"), "bitcoin");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "1.5");
    await user.clear(screen.getByLabelText("Cost Average"));
    await user.type(screen.getByLabelText("Cost Average"), "30000");
    await user.click(screen.getByRole("button", { name: "Create Token" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("");
    });
  });
});

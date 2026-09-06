// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { EMPTY_FILTERS, TransactionFilters } from "./transaction-filters";
import type { Category } from "@/lib/categories/categories-store";

const CATS: Category[] = [
  {
    id: "cat-1",
    name: "Food",
    color: "#22c55e",
    hideable: false,
    excludeFromAnalytics: false,
    monthlyBudgetMinor: null,
    assetId: null,
    createdAt: 0,
    updatedAt: 0,
  },
];

const ACCOUNTS = [{ id: "acc-1", name: "Checking" }];

function renderFilters(query: string) {
  const onChange = vi.fn();
  const utils = render(
    <TransactionFilters
      filters={{ ...EMPTY_FILTERS, query }}
      onChange={onChange}
      categories={CATS}
      accounts={ACCOUNTS}
    />,
  );
  const input = screen.getByLabelText("Search transactions") as HTMLInputElement;
  return { input, onChange, ...utils };
}

describe("TransactionFilters search input", () => {
  it("reports every keystroke immediately", () => {
    const { input, onChange } = renderFilters("");
    fireEvent.change(input, { target: { value: "c" } });
    fireEvent.change(input, { target: { value: "co" } });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "co" }),
    );
  });

  it("adopts an outside query change when blurred", () => {
    const { input, rerender } = renderFilters("");
    rerender(
      <TransactionFilters
        filters={{ ...EMPTY_FILTERS, query: "cofee" }}
        onChange={() => {}}
        categories={CATS}
        accounts={ACCOUNTS}
      />,
    );
    expect(input.value).toBe("cofee");
  });

  it("keeps in-progress typing when focused", () => {
    const { input, rerender } = renderFilters("");
    input.focus();
    fireEvent.change(input, { target: { value: "cof" } });
    rerender(
      <TransactionFilters
        filters={{ ...EMPTY_FILTERS, query: "external" }}
        onChange={() => {}}
        categories={CATS}
        accounts={ACCOUNTS}
      />,
    );
    expect(input.value).toBe("cof");
  });
});

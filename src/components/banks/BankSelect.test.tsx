import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { BankSelect } from "./BankSelect";
import type { Bank } from "@/lib/types";

const banks: Bank[] = [
  { id: "b1", user: "u1", name: "Checking", balance: 100, primaryColor: "#3b82f6" },
  { id: "b2", user: "u1", name: "Savings", balance: 200, primaryColor: "#10b981" },
];

describe("BankSelect", () => {
  it("renders with 'All Banks' option by default", () => {
    const onChange = vi.fn();
    render(createElement(BankSelect, { banks, onValueChange: onChange }));

    expect(screen.getByRole("combobox", { name: "Select bank" })).toBeInTheDocument();
  });

  it("calls onValueChange with undefined when 'All Banks' is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(createElement(BankSelect, { banks, value: "b1", onValueChange: onChange }));

    await user.click(screen.getByRole("combobox", { name: "Select bank" }));
    await user.click(screen.getByRole("option", { name: /All Banks/i }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("calls onValueChange with bank id when a bank is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(createElement(BankSelect, { banks, onValueChange: onChange }));

    const combobox = screen.getByRole("combobox", { name: "Select bank" });
    await user.click(combobox);

    const option = await screen.findByRole("option", { name: /Savings/i });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith("b2");
  });

  it("renders without 'All Banks' when showAll is false", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      createElement(BankSelect, { banks, onValueChange: onChange, showAll: false, value: "b1" }),
    );

    await user.click(screen.getByRole("combobox", { name: "Select bank" }));

    expect(screen.queryByRole("option", { name: /All Banks/i })).not.toBeInTheDocument();
  });
});

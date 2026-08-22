// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { NetWorthHero } from "./net-worth-hero";

describe("NetWorthHero", () => {
  it("renders total balance when privacy is off", () => {
    render(
      <NetWorthHero
        totalBalance={123456n}
        bankBalance={100000n}
        cryptoBalance={23456n}
        privacy={false}
        onTogglePrivacy={vi.fn()}
        lastSyncedAt={Date.now()}
      />,
    );
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    expect(screen.getByText("Banks: $1,000.00")).toBeInTheDocument();
    expect(screen.getByText("Crypto: $234.56")).toBeInTheDocument();
  });

  it("masks balance when privacy is on", () => {
    render(
      <NetWorthHero
        totalBalance={123456n}
        bankBalance={100000n}
        cryptoBalance={23456n}
        privacy={true}
        onTogglePrivacy={vi.fn()}
        lastSyncedAt={Date.now()}
      />,
    );
    expect(screen.getByText("••••")).toBeInTheDocument();
    expect(screen.getByText("Banks: ••••")).toBeInTheDocument();
    expect(screen.getByText("Crypto: ••••")).toBeInTheDocument();
  });

  it("calls onTogglePrivacy when eye button clicked", async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();
    render(
      <NetWorthHero
        totalBalance={0n}
        bankBalance={0n}
        cryptoBalance={0n}
        privacy={true}
        onTogglePrivacy={toggle}
        lastSyncedAt={null}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reveal balances" }));
    expect(toggle).toHaveBeenCalledOnce();
  });

  it("shows negative balance with minus sign", () => {
    render(
      <NetWorthHero
        totalBalance={-5000n}
        bankBalance={-5000n}
        cryptoBalance={0n}
        privacy={false}
        onTogglePrivacy={vi.fn()}
        lastSyncedAt={null}
      />,
    );
    expect(screen.getByText("-$50.00")).toBeInTheDocument();
  });
});

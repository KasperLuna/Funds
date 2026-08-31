// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { useSyncStore } from "@/lib/sync/sync-store";
import { NetWorthHero } from "./net-worth-hero";

describe("NetWorthHero", () => {
  beforeEach(() => {
    usePrivacyStore.setState({ masked: false });
    useSyncStore.setState({ syncStatus: { online: true, syncing: false, lastSyncedAt: Date.now(), failedCount: 0 } });
  });

  it("renders total balance when privacy is off", () => {
    render(
      <NetWorthHero
        totalBalance={123456n}
        bankBalance={100000n}
        cryptoBalance={23456n}
        onTogglePrivacy={vi.fn()}
      />,
    );
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
    expect(screen.getByText("$234.56")).toBeInTheDocument();
  });

  it("masks balance when privacy is on", () => {
    usePrivacyStore.setState({ masked: true });
    render(
      <NetWorthHero
        totalBalance={123456n}
        bankBalance={100000n}
        cryptoBalance={23456n}
        onTogglePrivacy={vi.fn()}
      />,
    );
    expect(screen.getByText("••••••")).toBeInTheDocument();
    expect(screen.getAllByText("••••")).toHaveLength(2);
  });

  it("calls onTogglePrivacy when eye button clicked", async () => {
    usePrivacyStore.setState({ masked: true });
    const user = userEvent.setup();
    const toggle = vi.fn();
    render(
      <NetWorthHero
        totalBalance={0n}
        bankBalance={0n}
        cryptoBalance={0n}
        onTogglePrivacy={toggle}
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
        onTogglePrivacy={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Net worth -$50.00")).toBeInTheDocument();
  });
});

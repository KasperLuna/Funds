// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { TradeCapture, type TradeCaptureProps } from "./trade-capture";
import type { Token } from "@/lib/crypto/crypto-store";
import type { CoinPrice } from "@/lib/crypto/rates";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const ACCOUNTS = [
  { id: "acc-1", name: "Checking", assetId: "USD", decimals: 2, kind: "bank" },
];

const TOKENS: Token[] = [
  {
    id: "tok-btc",
    coingeckoId: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 8,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
  },
];

const PRICES: Map<string, CoinPrice> = new Map([
  ["bitcoin", { current_price: 60000 } as unknown as CoinPrice],
]);

function Harness(props: Partial<TradeCaptureProps>) {
  const [open, setOpen] = useState(true);
  return (
    <TradeCapture
      isOpen={open}
      onOpenChange={setOpen}
      userId="usr-1"
      accounts={ACCOUNTS}
      tokens={TOKENS}
      prices={PRICES}
      onSave={() => {}}
      {...props}
    />
  );
}

describe("TradeCapture mobile focus", () => {
  it("mobile keypad collapses when a text input gains focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const key = screen.getByRole("button", { name: "5" });
    expect(key).toBeVisible();
    const rate = screen.getByRole("textbox", { name: "Rate" });
    await user.click(rate);
    // Wrapper exposes aria-hidden="true" once any text input is focused.
    const wrapper = key.parentElement!.parentElement!;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
  });
});

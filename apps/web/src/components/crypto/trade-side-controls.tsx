"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountOption } from "./trade-capture";
import type { Token } from "@/lib/crypto/crypto-store";

export interface TradeQuote {
  autoRate: number;
  computedBuyMinor: bigint;
}

type UseFormSetValue = import("react-hook-form").UseFormSetValue<Record<string, unknown>>;

interface BuySideControlsProps {
  fiatAccounts: AccountOption[];
  cryptoTokens: Token[];
  sellAccountId: string;
  buyTokenId: string;
  setValue: UseFormSetValue;
}

export const BuySideControls = ({ fiatAccounts, cryptoTokens, sellAccountId, buyTokenId, setValue }: BuySideControlsProps) => (
  <div className="flex items-center gap-2">
    <Select
      value={sellAccountId || "__placeholder__"}
      onValueChange={(v) => setValue("sellAccountId", v === "__placeholder__" ? "" : v, { shouldValidate: true })}
    >
      <SelectTrigger aria-label="Spend from" className="h-11 flex-1">
        <SelectValue placeholder="Spend from…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">Spend from…</SelectItem>
        {[...fiatAccounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <span aria-hidden className="text-zinc-500">→</span>
    <Select
      value={buyTokenId || "__placeholder__"}
      onValueChange={(v) => setValue("buyTokenId", v === "__placeholder__" ? "" : v, { shouldValidate: true })}
    >
      <SelectTrigger aria-label="Buy token" className="h-11 flex-1">
        <SelectValue placeholder="Select token…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">Select token…</SelectItem>
        {cryptoTokens.map((t) => (
          <SelectItem key={t.id} value={t.id}>{t.name} ({t.symbol})</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

interface SellSideControlsProps {
  fiatAccounts: AccountOption[];
  cryptoTokens: Token[];
  sellTokenId: string;
  buyAccountId: string;
  setValue: UseFormSetValue;
}

export const SellSideControls = ({ fiatAccounts, cryptoTokens, sellTokenId, buyAccountId, setValue }: SellSideControlsProps) => (
  <div className="flex items-center gap-2">
    <Select
      value={sellTokenId || "__placeholder__"}
      onValueChange={(v) => setValue("sellTokenId", v === "__placeholder__" ? "" : v, { shouldValidate: true })}
    >
      <SelectTrigger aria-label="Sell token" className="h-11 flex-1">
        <SelectValue placeholder="Select token…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">Select token…</SelectItem>
        {cryptoTokens.map((t) => (
          <SelectItem key={t.id} value={t.id}>{t.name} ({t.symbol})</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <span aria-hidden className="text-zinc-500">→</span>
    <Select
      value={buyAccountId || "__placeholder__"}
      onValueChange={(v) => setValue("buyAccountId", v === "__placeholder__" ? "" : v, { shouldValidate: true })}
    >
      <SelectTrigger aria-label="Receive to" className="h-11 flex-1">
        <SelectValue placeholder="Receive to…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">Receive to…</SelectItem>
        {[...fiatAccounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

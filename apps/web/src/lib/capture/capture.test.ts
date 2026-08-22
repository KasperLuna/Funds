import { describe, it, expect } from "vitest";
import {
  emptyAmount,
  digit,
  backspace,
  clearAmount,
  amountToMinor,
} from "./amount.js";
import { presetDate } from "./date.js";
import { recentRepeats, type RecentTxn } from "./suggestions.js";
import { buildTransactionRow, buildUndoTombstone } from "./payload.js";

const press = (state: ReturnType<typeof emptyAmount>, keys: Array<string>) =>
  keys.reduce((s, k) => digit(s, k as Parameters<typeof digit>[1]), state);

describe("amount keypad", () => {
  it("digits build minor units (decimals 2)", () => {
    const s = press(emptyAmount(2), ["1", "2", "5"]);
    expect(amountToMinor(s)).toBe(12500n);
  });

  it("0 . 5 -> 50 (decimals 2)", () => {
    const s = press(emptyAmount(2), ["0", ".", "5"]);
    expect(amountToMinor(s)).toBe(50n);
  });

  it(". 5 5 -> 55", () => {
    const s = press(emptyAmount(2), [".", "5", "5"]);
    expect(amountToMinor(s)).toBe(55n);
  });

  it("clamps fraction to decimals (1 . 2 3 4 -> 123)", () => {
    const s = press(emptyAmount(2), ["1", ".", "2", "3", "4"]);
    expect(s.input).toBe("1.23");
    expect(amountToMinor(s)).toBe(123n);
  });

  it("0 0 -> 0", () => {
    const s = press(emptyAmount(2), ["0", "0"]);
    expect(amountToMinor(s)).toBe(0n);
  });

  it("00 after 1 -> 100 (i.e. 100.00)", () => {
    const s = press(emptyAmount(2), ["1", "00"]);
    expect(amountToMinor(s)).toBe(10000n);
  });

  it("backspace removes last char", () => {
    const s = backspace(press(emptyAmount(2), ["1", "2", "5"]));
    expect(amountToMinor(s)).toBe(1200n);
  });

  it("backspace removes dot", () => {
    const s = backspace(press(emptyAmount(2), ["1", "."]));
    expect(s.input).toBe("1");
  });

  it("clear resets", () => {
    const s = clearAmount(press(emptyAmount(2), ["1", "2"]));
    expect(amountToMinor(s)).toBe(0n);
  });

  it("decimals 8 path", () => {
    const s = press(emptyAmount(8), ["0", ".", "0", "0", "0", "0", "0", "0", "0", "1"]);
    expect(amountToMinor(s)).toBe(1n);
  });

  it("digit after full fraction is no-op", () => {
    const s = press(emptyAmount(2), ["1", ".", "2", "3", "4", "5"]);
    expect(s.input).toBe("1.23");
  });

  it("dot with decimals 0 is no-op", () => {
    const s = press(emptyAmount(0), ["1", "."]);
    expect(s.input).toBe("1");
  });

  it("caps integer digits at 9", () => {
    const s = press(emptyAmount(2), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
    expect(s.input).toBe("123456789");
  });
});

describe("date presets", () => {
  it("today and yesterday from fixed now", () => {
    const now = new Date("2026-08-22T10:00:00Z");
    expect(presetDate("today", now).toISOString()).toBe("2026-08-22T10:00:00.000Z");
    expect(presetDate("yesterday", now).toISOString()).toBe("2026-08-21T10:00:00.000Z");
  });
});

describe("recent repeats", () => {
  const tx = (over: Partial<RecentTxn>): RecentTxn => ({
    id: "1",
    description: "Coffee",
    amountMinor: 1200n,
    categoryIds: ["food"],
    date: 1,
    ...over,
  });

  it("returns distinct combos latest first", () => {
    const list = [
      tx({ id: "a", date: 1 }),
      tx({ id: "b", date: 2 }),
      tx({ id: "c", date: 3, description: "Rent", amountMinor: 15000n }),
    ];
    const out = recentRepeats(list);
    expect(out).toHaveLength(2);
    expect(out[0]!.id).toBe("c");
    expect(out[1]!.id).toBe("b");
  });

  it("respects limit", () => {
    const list = [
      tx({ id: "a", description: "A", date: 3 }),
      tx({ id: "b", description: "B", date: 2 }),
      tx({ id: "c", description: "C", date: 1 }),
    ];
    expect(recentRepeats(list, 2)).toHaveLength(2);
  });
});

describe("payload", () => {
  const form = {
    type: "expense" as const,
    amountMinor: 5000n,
    accountId: "acc-1",
    assetId: "ast-1",
    userId: "usr-1",
    categoryIds: ["cat-1"],
    description: "Groceries",
    date: new Date("2026-08-22T00:00:00Z"),
  };

  it("expense row is negative", () => {
    const row = buildTransactionRow(form, new Date("2026-08-22T12:00:00Z"));
    expect(row.amount_minor).toBe(-5000);
    expect(row.type).toBe("expense");
    expect(row.user_id).toBe("usr-1");
    expect(row.created_at).toBe(row.updated_at);
    expect(typeof row.id).toBe("string");
  });

  it("income row is positive", () => {
    const row = buildTransactionRow({ ...form, type: "income" });
    expect(row.amount_minor).toBe(5000);
    expect(row.type).toBe("income");
  });

  it("undo tombstone sets deleted_at and bumps updated_at", () => {
    const row = buildTransactionRow(form, new Date("2026-08-22T12:00:00Z"));
    const undo = buildUndoTombstone(row, new Date("2026-08-22T12:00:05Z"));
    expect(undo.deleted_at).toBe(undo.updated_at);
    expect(undo.id).toBe(row.id);
    expect(Number(undo.updated_at)).toBeGreaterThan(Number(row.updated_at));
  });
});
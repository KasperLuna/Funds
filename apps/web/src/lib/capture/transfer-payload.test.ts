import { describe, it, expect } from "vitest";
import {
  buildTransferRows,
  validateTransfer,
  type TransferForm,
} from "./transfer-payload.js";

const NOW = new Date("2026-08-22T12:00:00Z");

const form: TransferForm = {
  fromAccountId: "acc-1",
  fromAssetId: "ast-1",
  toAccountId: "acc-2",
  toAssetId: "ast-2",
  amountMinor: 5000n,
  feeMinor: 0n,
  userId: "usr-1",
  description: "Move to savings",
  date: new Date("2026-08-22T00:00:00Z"),
};

describe("validateTransfer", () => {
  it("rejects same origin and destination", () => {
    expect(validateTransfer({ ...form, toAccountId: "acc-1" })).toBe(
      "Origin and destination must differ",
    );
  });

  it("rejects zero amount", () => {
    expect(validateTransfer({ ...form, amountMinor: 0n })).toBe(
      "Enter an amount",
    );
  });

  it("accepts a valid form", () => {
    expect(validateTransfer(form)).toBeNull();
  });
});

describe("buildTransferRows", () => {
  it("equal legs: expense on origin, income on destination, no fee row", () => {
    const rows = buildTransferRows(form, NOW);
    expect(rows.fromLeg.amount_minor).toBe(-5000);
    expect(rows.fromLeg.type).toBe("expense");
    expect(rows.fromLeg.account_id).toBe("acc-1");
    expect(rows.toLeg.amount_minor).toBe(5000);
    expect(rows.toLeg.type).toBe("income");
    expect(rows.toLeg.account_id).toBe("acc-2");
    expect(rows.feeLeg).toBeNull();
  });

  it("both legs share description, date, categories and transfer id", () => {
    const rows = buildTransferRows(form, NOW);
    for (const leg of [rows.fromLeg, rows.toLeg]) {
      expect(leg.description).toBe("Move to savings");
      expect(leg.date).toBe(form.date.getTime());
      expect(leg.category_ids).toEqual([]);
      expect(leg.transfer_id).toBe(rows.transfer.id);
      expect(leg.user_id).toBe("usr-1");
      expect(leg.created_at).toBe(NOW.getTime());
    }
  });

  it("fee becomes a separate expense on origin linked via transfers.fee_transaction_id", () => {
    const rows = buildTransferRows({ ...form, feeMinor: 250n }, NOW);
    expect(rows.feeLeg).not.toBeNull();
    expect(rows.feeLeg!.amount_minor).toBe(-250);
    expect(rows.feeLeg!.type).toBe("expense");
    expect(rows.feeLeg!.account_id).toBe("acc-1");
    expect(rows.feeLeg!.date).toBe(form.date.getTime());
    expect(rows.transfer.fee_transaction_id).toBe(rows.feeLeg!.id);
    // legs remain equal; fee is disclosed separately
    expect(rows.fromLeg.amount_minor).toBe(-5000);
    expect(rows.toLeg.amount_minor).toBe(5000);
  });

  it("zero fee produces no fee row and null link", () => {
    const rows = buildTransferRows(form, NOW);
    expect(rows.feeLeg).toBeNull();
    expect(rows.transfer.fee_transaction_id).toBeNull();
  });

  it("transfer row carries user and timestamps", () => {
    const rows = buildTransferRows(form, NOW);
    expect(rows.transfer.user_id).toBe("usr-1");
    expect(rows.transfer.created_at).toBe(NOW.getTime());
    expect(rows.transfer.updated_at).toBe(NOW.getTime());
    expect(typeof rows.transfer.id).toBe("string");
  });

  it("ids are unique across rows", () => {
    const rows = buildTransferRows({ ...form, feeMinor: 100n }, NOW);
    const ids = [
      rows.transfer.id,
      rows.fromLeg.id,
      rows.toLeg.id,
      rows.feeLeg!.id,
    ];
    expect(new Set(ids).size).toBe(4);
  });
});

import { advanceRecurrence, type Schedule } from "@funds/core";
import { waiveAdvance, type ScheduledTxn } from "@/lib/scheduled/compute";
import type { Txn } from "@/lib/accounts/accounts-store";

function scheduleFromScheduled(s: ScheduledTxn): Schedule {
  return {
    frequency: s.recurrence?.frequency ?? "monthly",
    interval: s.recurrence?.interval ?? 1,
    invokeDate: s.invokeDate ? new Date(s.invokeDate) : null,
    previousDate: s.previousDate ? new Date(s.previousDate) : null,
  };
}

function newId(): string {
  return `txn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logScheduled(s: ScheduledTxn, date?: Date): {
  transaction: Txn;
  previousDate: number;
  invokeDate: number;
} {
  const schedule = scheduleFromScheduled(s);
  const advanced = advanceRecurrence(schedule);
  const txnDate = date ?? new Date();

  const transaction: Txn = {
    id: newId(),
    accountId: s.accountId,
    assetId: "",
    amountMinor: s.amountMinor,
    type: s.type,
    description: s.description || s.name,
    categoryIds: s.categoryIds,
    date: txnDate.getTime(),
    deletedAt: null,
  };

  return {
    transaction,
    previousDate: advanced.previousDate.getTime(),
    invokeDate: advanced.invokeDate.getTime(),
  };
}

export function waiveScheduled(s: ScheduledTxn): {
  previousDate: number;
  invokeDate: number;
} {
  return waiveAdvance(s);
}

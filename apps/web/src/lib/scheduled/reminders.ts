/**
 * Reminder cron engine (logic.md §8.4). Pure orchestration over injected
 * data + sender, so it is fully unit-testable without a DB or network.
 */
import { shouldNotify, type ScheduledTxn } from "./compute";
import type { PushPayload, PushSubscription, SendFn } from "./push";

export interface ReminderDeps {
  now: Date;
  rows: ScheduledTxn[];
  subs: Array<PushSubscription & { userId: string }>;
  send: SendFn;
  markNotified: (ids: string[], at: Date) => Promise<void>;
  removeSubscriptions: (endpoints: string[]) => Promise<void>;
}

export interface ReminderResult {
  notifiedRowIds: string[];
  removedEndpoints: string[];
  failures: number;
}

export function reminderPayload(row: ScheduledTxn): PushPayload {
  return {
    title: `Log Now: ${row.description || row.name} due today!`,
    body: "Open the app to log this planned transaction.",
    url: `/dashboard/scheduled?plannedId=${row.id}`,
  };
}

export async function runReminders(deps: ReminderDeps): Promise<ReminderResult> {
  const { now, rows, subs, send, markNotified, removeSubscriptions } = deps;
  const subsByUser = new Map<string, Array<PushSubscription & { userId: string }>>();
  for (const s of subs) {
    const list = subsByUser.get(s.userId) ?? [];
    list.push(s);
    subsByUser.set(s.userId, list);
  }

  const notifiedRowIds: string[] = [];
  const removedEndpoints: string[] = [];
  let failures = 0;

  for (const row of rows) {
    if (!shouldNotify(row, now)) continue;
    const userSubs = subsByUser.get(row.userId) ?? [];
    if (userSubs.length === 0) continue;

    const payload = reminderPayload(row);
    let anyOk = false;
    for (const sub of userSubs) {
      const res = await send(sub, payload);
      if (res.ok) {
        anyOk = true;
      } else {
        failures++;
        if (res.gone) removedEndpoints.push(sub.endpoint);
      }
    }
    // Batch ack: only mark notified if at least one delivery succeeded.
    if (anyOk) notifiedRowIds.push(row.id);
  }

  if (notifiedRowIds.length > 0) {
    await markNotified(notifiedRowIds, now);
  }
  if (removedEndpoints.length > 0) {
    await removeSubscriptions(removedEndpoints);
  }

  return { notifiedRowIds, removedEndpoints, failures };
}

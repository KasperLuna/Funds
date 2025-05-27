// GET /api/cron-planned-reminders (App Router)
import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";
import webpush from "web-push";
import type { RecurrenceRule } from "@/lib/types";

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Helper: get all occurrences between two dates for a recurrence rule
function getOccurrencesBetween(
  rule: RecurrenceRule,
  startDate: string,
  from: Date,
  to: Date
): Date[] {
  // ...existing code from old handler...
  const occurrences: Date[] = [];
  let current = new Date(startDate);
  if (rule.endDate && new Date(rule.endDate) < from) return [];
  let count = 0;
  const maxCount = 1000; // safety
  while (current <= to && count < maxCount) {
    if (current >= from && current <= to) {
      if (rule.frequency === "weekly" && rule.byDay && rule.byDay.length > 0) {
        const weekday = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][
          current.getDay()
        ];
        if (!rule.byDay.includes(weekday)) {
          current.setDate(current.getDate() + 1);
          continue;
        }
      }
      if (
        rule.frequency === "monthly" &&
        rule.byMonthDay &&
        rule.byMonthDay.length > 0
      ) {
        if (!rule.byMonthDay.includes(current.getDate())) {
          current.setDate(current.getDate() + 1);
          continue;
        }
      }
      occurrences.push(new Date(current));
    }
    switch (rule.frequency) {
      case "daily":
        current.setDate(current.getDate() + (rule.interval || 1));
        break;
      case "weekly":
        current.setDate(current.getDate() + 1);
        break;
      case "monthly":
        current.setDate(current.getDate() + 1);
        break;
      case "yearly":
        current.setFullYear(current.getFullYear() + (rule.interval || 1));
        break;
      default:
        return occurrences;
    }
    count++;
    if (rule.endDate && current > new Date(rule.endDate)) break;
  }
  return occurrences;
}

async function wasNotified(
  plannedId: string,
  occurrence: Date
): Promise<boolean> {
  const key = `${plannedId}_${occurrence.toISOString().slice(0, 16)}`;
  const record = await pb
    .collection("planned_notifications")
    .getFirstListItem(`key='${key}'`)
    .catch(() => null);
  return !!record;
}

async function markNotified(plannedId: string, occurrence: Date) {
  const key = `${plannedId}_${occurrence.toISOString().slice(0, 16)}`;
  await pb.collection("planned_notifications").create({ key });
}

export async function GET(req: NextRequest) {
  // Security: require CRON_SECRET as query param
  const url = new URL(req.url);
  const secret = url.searchParams.get("CRON_SECRET");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // 1. Get all planned transactions
  const planned = await pb
    .collection("planned_transactions")
    .getFullList({ filter: "active=true" });
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000); // next hour
  let notified = 0;

  for (const tx of planned) {
    if (!tx.recurrence || !tx.startDate) continue;
    const occurrences = getOccurrencesBetween(
      tx.recurrence,
      tx.startDate,
      now,
      soon
    );
    for (const occ of occurrences) {
      if (await wasNotified(tx.id, occ)) continue;
      const subs = await pb.collection("push_subscriptions").getFullList({
        filter: `user='${tx.user}'`,
      });
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            JSON.stringify({
              title: "Upcoming Planned Transaction",
              body: `Reminder: ${tx.description} is due soon!`,
              url: `/dashboard?plannedId=${tx.id}`,
            })
          );
          notified++;
        } catch (err: any) {
          if (
            err?.statusCode === 410 ||
            err?.statusCode === 404 ||
            (typeof err?.body === "string" && err.body.includes("unsubscribed"))
          ) {
            await pb.collection("push_subscriptions").delete(sub.id);
          }
        }
      }
      await markNotified(tx.id, occ);
    }
  }
  return NextResponse.json({ notified });
}

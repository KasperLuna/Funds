// Vercel Cron Job: Planned Transaction Reminder
// Endpoint: /api/cron-planned-reminders
// Schedules: e.g. every hour via Vercel Cron

import { NextApiRequest, NextApiResponse } from "next";
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
  const occurrences: Date[] = [];
  let current = new Date(startDate);
  if (rule.endDate && new Date(rule.endDate) < from) return [];
  let count = 0;
  const maxCount = 1000; // safety
  while (current <= to && count < maxCount) {
    // Only consider occurrences after 'from'
    if (current >= from && current <= to) {
      // ByDay (for weekly)
      if (rule.frequency === "weekly" && rule.byDay && rule.byDay.length > 0) {
        const weekday = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][
          current.getDay()
        ];
        if (!rule.byDay.includes(weekday)) {
          // Move to next day
          current.setDate(current.getDate() + 1);
          continue;
        }
      }
      // ByMonthDay (for monthly)
      if (
        rule.frequency === "monthly" &&
        rule.byMonthDay &&
        rule.byMonthDay.length > 0
      ) {
        if (!rule.byMonthDay.includes(current.getDate())) {
          // Move to next day
          current.setDate(current.getDate() + 1);
          continue;
        }
      }
      occurrences.push(new Date(current));
    }
    // Advance to next occurrence
    switch (rule.frequency) {
      case "daily":
        current.setDate(current.getDate() + (rule.interval || 1));
        break;
      case "weekly":
        current.setDate(current.getDate() + 1); // step by day, filter by byDay
        break;
      case "monthly":
        current.setDate(current.getDate() + 1); // step by day, filter by byMonthDay
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

// Helper: check if a notification was already sent for a planned transaction occurrence
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

// Helper: mark a planned transaction occurrence as notified
async function markNotified(plannedId: string, occurrence: Date) {
  const key = `${plannedId}_${occurrence.toISOString().slice(0, 16)}`;
  await pb.collection("planned_notifications").create({ key });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  // 1. Get all planned transactions
  const planned = await pb
    .collection("planned_transactions")
    .getFullList({ filter: "active=true" });
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000); // next hour
  let notified = 0;

  for (const tx of planned) {
    if (!tx.recurrence || !tx.startDate) continue;
    // Find all occurrences between now and soon
    const occurrences = getOccurrencesBetween(
      tx.recurrence,
      tx.startDate,
      now,
      soon
    );
    for (const occ of occurrences) {
      if (await wasNotified(tx.id, occ)) continue; // skip if already notified
      // 2. Get user push subscriptions
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
              url: `/dashboard?plannedId=${tx.id}`, // deep link with plannedId
            })
          );
          notified++;
        } catch (err: any) {
          // Remove invalid/expired subscriptions
          if (
            err?.statusCode === 410 || // Gone
            err?.statusCode === 404 || // Not Found
            (typeof err?.body === "string" && err.body.includes("unsubscribed"))
          ) {
            await pb.collection("push_subscriptions").delete(sub.id);
          }
        }
      }
      await markNotified(tx.id, occ);
    }
  }
  res.json({ notified });
}

// To schedule: set up Vercel Cron to POST to /api/cron-planned-reminders

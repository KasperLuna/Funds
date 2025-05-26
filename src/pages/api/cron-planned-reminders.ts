// Vercel Cron Job: Planned Transaction Reminder
// Endpoint: /api/cron-planned-reminders
// Schedules: e.g. every hour via Vercel Cron

import { NextApiRequest, NextApiResponse } from "next";
import PocketBase from "pocketbase";
import webpush from "web-push";

const pb = new PocketBase(process.env.PB_URL);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Helper: get next occurrence after now (simple recurrence, no rrule)
// Supported: daily, weekly, monthly, yearly
function getNextOccurrenceSimple(
  recurrence: string, // e.g. 'daily', 'weekly', 'monthly', 'yearly'
  startDate: string, // ISO string
  after: Date
): Date | null {
  let next = new Date(startDate);
  while (next <= after) {
    switch (recurrence) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        return null;
    }
  }
  return next;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  // 1. Get all planned transactions
  const planned = await pb.collection("planned_transactions").getFullList({});
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000); // next hour
  let notified = 0;

  for (const tx of planned) {
    // tx: { user, title, recurrence, startDate, ... }
    if (!tx.recurrence || !tx.startDate) continue;
    const next = getNextOccurrenceSimple(tx.recurrence, tx.startDate, now);
    if (!next || next > soon) continue;
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
            body: `Reminder: ${tx.title} is due soon!`,
            url: "/dashboard", // or a deep link
          })
        );
        notified++;
      } catch {
        // Optionally: remove invalid subscriptions
      }
    }
  }
  res.json({ notified });
}

// To schedule: set up Vercel Cron to POST to /api/cron-planned-reminders

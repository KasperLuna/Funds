// Vercel Cron Job: Planned Transaction Reminder
// Endpoint: /api/cron-planned-reminders
// Schedules: e.g. every hour via Vercel Cron

import { NextApiRequest, NextApiResponse } from "next";
import PocketBase from "pocketbase";
import webpush from "web-push";
import { RRule } from "rrule";

const pb = new PocketBase(process.env.PB_URL);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Helper: get next occurrence after now
function getNextOccurrence(rruleString: string, after: Date): Date | null {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.after(after, true);
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  // 1. Get all planned transactions
  const planned = await pb.collection("planned_transactions").getFullList({});
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000); // next hour
  let notified = 0;

  for (const tx of planned) {
    // tx: { user, title, recurrenceRule, ... }
    if (!tx.recurrenceRule) continue;
    const next = getNextOccurrence(tx.recurrenceRule, now);
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
      } catch (e) {
        // Optionally: remove invalid subscriptions
      }
    }
  }
  res.json({ notified });
}

// To schedule: set up Vercel Cron to POST to /api/cron-planned-reminders

// GET /api/cron-planned-reminders (App Router)
import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";
import webpush from "web-push";
import type { PlannedTransaction } from "@/lib/types";
import { isPlannedTransactionToday } from "@/lib/utils";

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:mail@kasperluna.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const secret = body.CRON_SECRET;
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Authenticate as PocketBase admin (superuser)
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  );
  // 1. Get all planned transactions
  const planned: PlannedTransaction[] = await pb
    .collection("planned_transactions")
    .getFullList({ filter: "active=true" });
  console.log(`[CRON] Retrieved ${planned.length} planned transactions.`);
  if (planned.length > 0) {
    console.log(
      "[CRON] Planned transaction IDs:",
      planned.map((tx) => tx.id)
    );
  }
  const now = new Date();
  let notified = 0;
  console.log("[CRON] now (UTC):", now.toISOString());

  // for each planned transaction, check if it should notify the user
  // the startDate is stored UTC, so we need to convert it to the user's timezone
  // the user timezone is stored as timezone and its value is the offset in hours
  // the notification should be sent if:
  // - the transaction is active
  // - the transaction has a startDate
  // - the transaction is either today or has a recurrence that matches today
  // - the transaction is not logged yet (lastLoggedAt is null or not today)
  // - the transaction has not been notified in the past 3 hours
  for (const tx of planned) {
    if (!tx.active) {
      console.log(
        `[CRON] Planned transaction ${tx.id} is not active, skipping.`
      );
      continue;
    }
    if (!tx.startDate) {
      console.log(
        `[CRON] Planned transaction ${tx.id} has no startDate, skipping.`
      );
      continue;
    }
    const today = new Date();
    if (isPlannedTransactionToday(tx, today)) {
      console.log(`[CRON] Planned transaction ${tx.id} is for today.`);
      const startDate = new Date(tx.startDate);
      if (now < startDate) {
        console.log(
          `[CRON] Too early to notify for planned transaction ${tx.id}. Start time is ${startDate.toISOString()}`
        );
        continue;
      }
      // Check if the transaction has been logged today
      let lastLoggedAt = tx.lastLoggedAt ? new Date(tx.lastLoggedAt) : null;
      const isLoggedToday =
        lastLoggedAt &&
        lastLoggedAt.getUTCFullYear() === now.getUTCFullYear() &&
        lastLoggedAt.getUTCMonth() === now.getUTCMonth() &&
        lastLoggedAt.getUTCDate() === now.getUTCDate();
      if (isLoggedToday) {
        console.log(
          `[CRON] Planned transaction ${tx.id} has already been logged today. Skipping notification.`
        );
        continue;
      }
      // Check if the transaction has been notified in the past 3 hours
      const lastNotifiedAt = tx.lastNotifiedAt
        ? new Date(tx.lastNotifiedAt)
        : null;
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const notifiedToday =
        lastNotifiedAt &&
        lastNotifiedAt.getUTCFullYear() === now.getUTCFullYear() &&
        lastNotifiedAt.getUTCMonth() === now.getUTCMonth() &&
        lastNotifiedAt.getUTCDate() === now.getUTCDate();
      if (!notifiedToday || lastNotifiedAt < threeHoursAgo) {
        console.log(`[CRON] Notifying user for planned transaction ${tx.id}.`);
        // Get the user's push subscription
        const subscriptions = await pb
          .collection("push_subscriptions")
          .getFullList({ filter: `user="${tx.user}"` });
        const payload = JSON.stringify({
          title: `Log Now: ${tx.description}`,
          body: `Amount: ${tx.amount}, press to log this transaction.`,
          url: `/dashboard?plannedId=${tx.id}`,
        });
        if (subscriptions.length > 0) {
          // Send the notification to all subscriptions
          const sendResults = await Promise.allSettled(
            subscriptions.map((subscription) => {
              const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.keys.p256dh,
                  auth: subscription.keys.auth,
                },
              };
              return webpush.sendNotification(pushSubscription, payload, {
                headers: {
                  TTL: "3600", // 1 hour
                },
              });
            })
          );
          // Log results and count successful notifications
          const successful = sendResults.filter(
            (r) => r.status === "fulfilled"
          ).length;
          if (successful > 0) {
            console.log(
              `[CRON] Notification sent for planned transaction ${tx.id} to ${successful} subscriptions.`
            );
            notified++;
            // Update the lastNotifiedAt field
            if (!tx.id) {
              console.error(
                `[CRON] Planned transaction ${tx.id} has no ID, cannot update lastNotifiedAt.`
              );
              continue;
            }
            await pb.collection("planned_transactions").update(tx.id, {
              lastNotifiedAt: now.toISOString(),
            });
          }
          // Optionally log or handle rejected notifications
          sendResults.forEach((result, idx) => {
            if (result.status === "rejected") {
              console.error(
                `[CRON] Failed to send notification for planned transaction ${tx.id} to subscription #${idx}:`,
                result.reason
              );
            }
          });
        } else {
          console.log(
            `[CRON] No push subscription found for user ${tx.user} for planned transaction ${tx.id}.`
          );
        }
      } else {
        console.log(
          `[CRON] Planned transaction ${tx.id} has already been notified in the past 3 hours.`
        );
      }
    }
  }

  console.log(`[CRON] Total notifications sent: ${notified}`);
  return NextResponse.json({ notified });
}

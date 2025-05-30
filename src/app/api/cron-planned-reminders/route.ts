// GET /api/cron-planned-reminders (App Router)
import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";
import webpush from "web-push";
import type { PlannedTransaction } from "@/lib/types";
import { getLocalDateFromUTC } from "@/lib/utils";

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
  const toUpdate: { id: string; lastNotifiedAt: string }[] = [];
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
    if (!tx.invokeDate) {
      console.log(
        `[CRON] Planned transaction ${tx.id} has no invokeDate, skipping.`
      );
      continue;
    }
    // Always use the user's local timezone for all date checks
    const localNow = getLocalDateFromUTC(now, tx.timezone);
    const localToday = new Date(localNow);
    localToday.setHours(0, 0, 0, 0);
    const localInvokeDate = getLocalDateFromUTC(tx.invokeDate, tx.timezone);
    localInvokeDate.setHours(0, 0, 0, 0);
    if (localInvokeDate.getTime() === localToday.getTime()) {
      console.log(`[CRON] Planned transaction ${tx.id} is for today.`);
      if (localNow < getLocalDateFromUTC(tx.invokeDate, tx.timezone)) {
        console.log(
          `[CRON] Too early to notify for planned transaction ${tx.id}. Invoke time is ${tx.invokeDate}`
        );
        continue;
      }
      // Check if the transaction has been notified in the past 3 hours (in user's local time)
      const lastNotifiedAt = tx.lastNotifiedAt
        ? getLocalDateFromUTC(tx.lastNotifiedAt, tx.timezone)
        : null;
      const threeHoursAgo = new Date(localNow.getTime() - 3 * 60 * 60 * 1000);
      const notifiedToday =
        lastNotifiedAt &&
        lastNotifiedAt.getFullYear() === localToday.getFullYear() &&
        lastNotifiedAt.getMonth() === localToday.getMonth() &&
        lastNotifiedAt.getDate() === localToday.getDate();
      if (
        !notifiedToday ||
        (lastNotifiedAt && lastNotifiedAt < threeHoursAgo)
      ) {
        console.log(`[CRON] Notifying user for planned transaction ${tx.id}.`);
        // Get the user's push subscription
        const subscriptions = await pb
          .collection("push_subscriptions")
          .getFullList({ filter: `user="${tx.user}"` });
        const payload = JSON.stringify({
          title: `Log Now: ${tx.description} due today!`,
          body: `Open Funds to log this transaction.`,
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
            // Collect for batch update
            toUpdate.push({ id: tx.id, lastNotifiedAt: now.toISOString() });
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

  // Batch update lastNotifiedAt for all notified transactions
  if (toUpdate.length > 0) {
    const batch = pb.createBatch();
    toUpdate.forEach((entry) => {
      batch
        .collection("planned_transactions")
        .update(entry.id, { lastNotifiedAt: entry.lastNotifiedAt });
    });
    await batch.send();
    console.log(
      `[CRON] Batch updated lastNotifiedAt for ${toUpdate.length} planned transactions.`
    );
  }

  console.log(`[CRON] Total notifications sent: ${notified}`);
  return NextResponse.json({ notified });
}

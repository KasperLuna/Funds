import { NextResponse } from "next/server";
import webpush from "web-push";
import PocketBase from "pocketbase";
import { calculateNextOccurrence } from "@/lib/utils/recurrence";
import type { PlannedTransaction, PushSubscription } from "@/lib/types";

// ── VAPID Configuration ──────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a fresh PocketBase client for server-side use (no shared auth state).
 */
function createServerPb(): PocketBase {
  const url = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://localhost:8090";
  const client = new PocketBase(url);
  client.autoCancellation(false);
  return client;
}

/**
 * Sends a push notification to a single subscription endpoint.
 * Returns true on success, false if the subscription is invalid (410 Gone).
 */
async function sendPushNotification(
  subscription: PushSubscription,
  payload: string,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      payload,
    );
    return true;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    // 410 Gone or 404 means the subscription is no longer valid
    if (statusCode === 410 || statusCode === 404) {
      return false;
    }
    // Log other errors but don't fail the whole job
    console.error("Push notification error:", error);
    return true; // keep the subscription for transient errors
  }
}

// ── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pb = createServerPb();
  const now = new Date();
  let processedCount = 0;

  try {
    // Fetch all active planned transactions where invokeDate <= now
    const duePlanned = await pb.collection("planned_transactions").getFullList<PlannedTransaction>({
      filter: `active = true && invokeDate <= "${now.toISOString()}"`,
    });

    for (const planned of duePlanned) {
      try {
        // 1. Create a corresponding transaction
        await pb.collection("transactions").create({
          user: planned.user,
          description: planned.description,
          type: planned.type,
          amount: planned.amount,
          bank: planned.bank,
          categories: planned.categories,
          date: new Date(planned.invokeDate).toISOString(),
        });

        // 2. Calculate next occurrence and update the planned transaction
        const nextOccurrence = calculateNextOccurrence(
          planned.recurrence,
          new Date(planned.invokeDate),
        );

        await pb.collection("planned_transactions").update(planned.id!, {
          previousDate: new Date(planned.invokeDate).toISOString(),
          invokeDate: nextOccurrence.toISOString(),
          lastNotifiedAt: now.toISOString(),
        });

        // 3. Send push notifications to all subscribed devices for this user
        const subscriptions = await pb
          .collection("push_subscriptions")
          .getFullList<PushSubscription>({
            filter: `user = "${planned.user}"`,
          });

        const payload = JSON.stringify({
          title: "Planned Transaction Triggered",
          body: `${planned.description}: ${planned.type} of ${planned.amount}`,
          data: { plannedTransactionId: planned.id },
        });

        // Send to all devices, remove invalid subscriptions
        const results = await Promise.allSettled(
          subscriptions.map(async (sub) => {
            const valid = await sendPushNotification(sub, payload);
            if (!valid && sub.id) {
              await pb.collection("push_subscriptions").delete(sub.id);
            }
          }),
        );

        // Log any rejected promises for debugging
        results
          .filter((r) => r.status === "rejected")
          .forEach((r) =>
            console.error("Notification send failed:", (r as PromiseRejectedResult).reason),
          );

        processedCount++;
      } catch (error) {
        console.error(`Failed to process planned transaction ${planned.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import PocketBase from "pocketbase";
import webpush from "web-push";

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

  // Get all push subscriptions
  const subscriptions = await pb.collection("push_subscriptions").getFullList();
  let notified = 0;
  const payload = JSON.stringify({
    title: `Test Notification`,
    body: `This is a test push notification from Funds.`,
    url: `/dashboard`,
  });
  if (subscriptions.length > 0) {
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
    notified = sendResults.filter((r) => r.status === "fulfilled").length;
    sendResults.forEach((result, idx) => {
      if (result.status === "rejected") {
        console.error(
          `[TEST-NOTIFICATION] Failed to send notification to subscription #${idx}:`,
          result.reason
        );
      }
    });
  }
  return NextResponse.json({ notified });
}

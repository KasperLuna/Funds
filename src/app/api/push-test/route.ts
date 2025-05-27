import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { pb } from "@/lib/pocketbase/pocketbase";

// Set your VAPID keys here or use env variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "https://funds.kasperluna.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, title, body: notifBody, url } = body;
    if (!userId)
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Get all push subscriptions for this user
    const subs = await pb.collection("push_subscriptions").getFullList({
      filter: `user="${userId}"`,
    });
    if (!subs.length)
      return NextResponse.json(
        { error: "No subscriptions found" },
        { status: 404 }
      );

    // Send a test notification to each subscription
    const payload = JSON.stringify({
      title: title || "Test Notification",
      body: notifBody || "This is a test notification",
      url: url || "/dashboard",
    });

    const results = await Promise.allSettled(
      subs.map((sub: any) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            payload
          )
          .catch(async (err) => {
            // Clean up invalid/expired subscriptions
            if (
              err.statusCode === 410 || // Gone
              err.statusCode === 404 || // Not Found
              err.body?.includes("unsubscribed")
            ) {
              await pb.collection("push_subscriptions").delete(sub.id);
            }
            throw err;
          })
      )
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

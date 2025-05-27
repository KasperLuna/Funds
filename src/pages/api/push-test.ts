import type { NextApiRequest, NextApiResponse } from "next";
import webpush from "web-push";
import { pb } from "@/lib/pocketbase/pocketbase";

// Set your VAPID keys here or use env variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "https://funds.kasperluna.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the current user (assume auth token in cookies or session)
    // For test, you can pass userId in the body
    const { userId, title, body, url } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Get all push subscriptions for this user
    const subs = await pb.collection("push_subscriptions").getFullList({
      filter: `user="${userId}"`,
    });
    if (!subs.length)
      return res.status(404).json({ error: "No subscriptions found" });

    // Send a test notification to each subscription
    const payload = JSON.stringify({
      title: title || "Test Notification",
      body: body || "This is a test notification",
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

    res.status(200).json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

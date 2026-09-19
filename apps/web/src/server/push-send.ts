/**
 * Shared Web Push delivery: fan out to a user's live subscriptions, prune
 * endpoints the push service reports gone. Used by draft review-push and the
 * self-test endpoint. Callers own logging (context differs per caller).
 */
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as schema from "@funds/db/schema";
import { createVapidSender, type PushPayload } from "@/lib/scheduled/push";

export interface PushSendResult {
  delivered: number;
  total: number;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<PushSendResult> {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!publicKey || !privateKey) return { delivered: 0, total: 0 };
  const db = getDb();
  const subs = await db
    .select({ endpoint: schema.pushSubscriptions.endpoint, keys: schema.pushSubscriptions.keys })
    .from(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, userId),
        isNull(schema.pushSubscriptions.deletedAt),
      ),
    );
  if (subs.length === 0) return { delivered: 0, total: 0 };
  const send = createVapidSender(
    {
      publicKey,
      privateKey,
      subject: process.env.VAPID_SUBJECT ?? "mailto:admin@funds.app",
    },
    fetchImpl,
  );
  let delivered = 0;
  for (const sub of subs) {
    try {
      const res = await send(sub, payload);
      if (res.ok) delivered++;
      if (res.gone) {
        await db
          .update(schema.pushSubscriptions)
          .set({ deletedAt: new Date() })
          .where(eq(schema.pushSubscriptions.endpoint, sub.endpoint));
      }
    } catch {
      // single-device failure must not block the rest
    }
  }
  return { delivered, total: subs.length };
}

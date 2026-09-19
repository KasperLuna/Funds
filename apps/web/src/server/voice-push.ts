/**
 * Review-push for Shortcut/voice drafts. Fire-and-forget from the webhook:
 * a push outage must never fail the intake.
 */
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import * as schema from "@funds/db/schema";
import type { ParsedResult } from "@funds/core/parser";
import { assetSymbol } from "@/lib/money";
import { createVapidSender } from "@/lib/scheduled/push";

function formatMajor(amount: number): string {
  return Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

export interface DraftPushCopy {
  title: string;
  body: string;
  url: string;
}

export function draftPushCopy(
  preview: ParsedResult,
  accountName: string | null,
  draftId: string,
  origin: string,
): DraftPushCopy {
  const description = preview.description?.trim() || preview.rawText.trim();
  const amount =
    preview.amount !== undefined && !Number.isNaN(preview.amount)
      ? `-${assetSymbol(preview.currency)}${formatMajor(preview.amount)}`
      : null;
  return {
    title: amount ? `${amount} ${description}` : description,
    body: `Tap to review and save · ${accountName ?? "Funds"}`,
    url: `${origin}/dashboard?draftId=${encodeURIComponent(draftId)}`,
  };
}

export async function notifyDraftPush(
  userId: string,
  copy: { title: string; body: string; url: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!publicKey || !privateKey) return;
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
  if (subs.length === 0) return;
  const send = createVapidSender(
    {
      publicKey,
      privateKey,
      subject: process.env.VAPID_SUBJECT ?? "mailto:admin@funds.app",
    },
    fetchImpl,
  );
  const payload = { title: copy.title, body: copy.body, url: copy.url };
  for (const sub of subs) {
    try {
      const res = await send(sub, payload);
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
}

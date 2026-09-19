/**
 * Review-push for Shortcut/voice drafts. Fire-and-forget from the webhook:
 * a push outage must never fail the intake.
 */
import type { ParsedResult } from "@funds/core/parser";
import { assetSymbol } from "@/lib/money";
import { sendPushToUser } from "@/server/push-send";

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
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("[voice] push skipped: VAPID keys missing");
    return;
  }
  const { delivered, total } = await sendPushToUser(
    userId,
    { title: copy.title, body: copy.body, url: copy.url },
    fetchImpl,
  );
  if (total === 0) {
    console.warn("[voice] push skipped: no subscriptions for user");
  } else if (delivered === 0) {
    console.warn(`[voice] push reached 0 of ${total} subscriptions`);
  }
}

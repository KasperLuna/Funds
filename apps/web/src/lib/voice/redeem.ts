import type { ParsedResult } from "@funds/core/parser";

export interface VoiceDraftPreview {
  preview: ParsedResult;
  source: string;
}

export async function redeemDraft(token: string): Promise<VoiceDraftPreview | null> {
  try {
    const res = await fetch(`/api/voice/redeem/${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    return (await res.json()) as VoiceDraftPreview;
  } catch {
    return null;
  }
}

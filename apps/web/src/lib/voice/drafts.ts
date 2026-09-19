import type { ParsedResult } from "@funds/core/parser";

export interface DraftItem {
  id: string;
  accountId: string | null;
  preview: ParsedResult;
  source: string;
  createdAt: string;
  expiresAt: string;
}

export async function listDrafts(): Promise<DraftItem[]> {
  const res = await fetch("/api/voice/drafts");
  if (!res.ok) throw new Error(`Drafts fetch failed: ${res.status}`);
  const body = (await res.json()) as { drafts: DraftItem[] };
  return body.drafts;
}

export async function discardDraft(id: string): Promise<void> {
  const res = await fetch(`/api/voice/drafts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Draft discard failed: ${res.status}`);
}

import type { Txn, Account } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";

/**
 * Build the local-context snapshot the assistant feeds to the model. The
 * snapshot is intentionally small: only names, ids, codes, and the user's
 * timezone. Money is NEVER included — the model doesn't need it, and
 * shipping transaction amounts to a local model is still over-share.
 *
 * cavetail: the snapshot is capped at ~2 KB. The model context is precious,
 * and accounts/categories beyond the cap would dilute the model's focus on
 * the user's question. The cap is applied to the LARGEST lists first
 * (categories) so the user still sees their primary account.
 */
export type AssistantSnapshot = {
  tz: string;
  nowIso: string;
  accounts: Array<{ id: string; name: string; kind: Account["kind"]; assetCode: string }>;
  categories: Array<{ id: string; name: string }>;
};

const SNAPSHOT_BYTE_BUDGET = 2_000;

function truncate<T>(items: T[], max: number, score: (t: T) => number): T[] {
  return [...items].sort((a, b) => score(b) - score(a)).slice(0, max);
}

function approxBytes(s: string): number {
  return s.length;
}

export function buildSnapshot(args: {
  accounts: Account[];
  categories: Category[];
  txns: Txn[];
  /** Map of assetId -> code, used to surface currency in the snapshot. */
  assetsById: Map<string, { code: string }>;
}): AssistantSnapshot {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const accountCount = new Map<string, number>();
  for (const t of args.txns) {
    if (t.deletedAt) continue;
    accountCount.set(t.accountId, (accountCount.get(t.accountId) ?? 0) + 1);
  }
  const accounts = truncate(args.accounts.filter((a) => !a.deletedAt), 24, (a) => {
    if (a.archived) return -1;
    return accountCount.get(a.id) ?? 0;
  }).map((a) => {
    const code = args.assetsById.get(a.assetId)?.code ?? "USD";
    return { id: a.id, name: a.name, kind: a.kind, assetCode: code };
  });

  const categoryCount = new Map<string, number>();
  for (const t of args.txns) {
    if (t.deletedAt) continue;
    for (const cid of t.categoryIds) {
      categoryCount.set(cid, (categoryCount.get(cid) ?? 0) + 1);
    }
  }
  const categories = truncate(
    args.categories.filter((c) => !c.deletedAt),
    40,
    (c) => categoryCount.get(c.id) ?? 0,
  ).map((c) => ({ id: c.id, name: c.name }));

  let snapshot: AssistantSnapshot = {
    tz,
    nowIso: new Date().toISOString(),
    accounts,
    categories,
  };
  let bytes = approxBytes(JSON.stringify(snapshot));
  if (bytes > SNAPSHOT_BYTE_BUDGET) {
    snapshot = { ...snapshot, categories: categories.slice(0, 24) };
    bytes = approxBytes(JSON.stringify(snapshot));
  }
  if (bytes > SNAPSHOT_BYTE_BUDGET) {
    snapshot = { ...snapshot, accounts: accounts.slice(0, 12) };
  }
  return snapshot;
}

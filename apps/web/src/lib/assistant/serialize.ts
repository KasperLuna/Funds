import type { Txn, Account } from "@/lib/accounts/accounts-store";
import type { Category } from "@/lib/categories/categories-store";
import { resolveTerms, type ResolvedTerms } from "./resolver";

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
  /**
   * What the resolver pre-matched from the user's words. The model sees
   * this so it can emit a query that references the *actual* category name
   * (e.g. "Food") even when the user said a synonym ("dining"). The
   * `descriptionPattern` is also surfaced so the model can pick the
   * `search` select when the user asked about a description.
   *
   * Optional in the type because `inferUseCase` (a pure keyword heuristic)
   * is invoked with hand-built snapshots in tests.
   */
  resolved?: ResolvedTerms;
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
  /** The raw user message — used to pre-resolve synonyms ("dining" -> "Food")
   * and description patterns ("payroll") before the model sees anything. */
  userText?: string;
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

  // Run the resolver over the full category set (not just the truncated top
  // 24) so a low-frequency but exact-match category still wins.
  const resolved = resolveTerms({
    userText: args.userText ?? "",
    categories: args.categories.filter((c) => !c.deletedAt),
  });

  let snapshot: AssistantSnapshot = {
    tz,
    nowIso: new Date().toISOString(),
    accounts,
    categories,
    resolved,
  };
  let bytes = approxBytes(JSON.stringify(snapshot));
  if (bytes > SNAPSHOT_BYTE_BUDGET) {
    snapshot = { ...snapshot, categories: categories.slice(0, 24) };
    bytes = approxBytes(JSON.stringify(snapshot));
  }
  if (bytes > SNAPSHOT_BYTE_BUDGET) {
    snapshot = { ...snapshot, accounts: accounts.slice(0, 12) };
  }
  // The byte budget can hide the resolver's matched category from the model.
  // If we resolved a category that didn't survive truncation, prepend it so
  // the model sees it and emits the correct query name. Idempotent.
  if (resolved.category && !snapshot.categories.some((c) => c.name === resolved.category)) {
    snapshot = {
      ...snapshot,
      categories: [{ id: "__resolved__", name: resolved.category }, ...snapshot.categories],
    };
  }
  return snapshot;
}

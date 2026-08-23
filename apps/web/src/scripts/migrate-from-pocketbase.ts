/**
 * One-shot PocketBase → Postgres migration script (multi-user).
 *
 * Reads a PocketBase backup served over HTTP (see scripts/import-pocketbase.sh)
 * and imports EVERY PocketBase user as a separate Funds user, each scoped to
 * their own banks/categories/transactions/planned/tokens.
 *
 * User-scoped collections (listRule: user = @request.auth.id) require a
 * superuser token; provide POCKETBASE_EMAIL/POCKETBASE_PASSWORD (the shell
 * wrapper creates a throwaway superuser on the temp instance).
 *
 * Usage:
 *   POCKETBASE_URL=http://localhost:8090 POCKETBASE_EMAIL=... POCKETBASE_PASSWORD=... \
 *     DATABASE_URL=postgres://... tsx apps/web/src/scripts/migrate-from-pocketbase.ts
 *   ... --dry
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { ulid } from "@funds/core/server";
import {
  assets,
  accounts,
  categories,
  categoryBudgets,
  transactions,
  transfers,
  trades,
  tokens,
  tokenTransactions,
  templates,
  scheduledTransactions,
  users,
  ratesHistory,
} from "@funds/db/schema";

// ─── Config ──────────────────────────────────────────────────────────────────

const PB_URL = process.env.POCKETBASE_URL;
const PB_EMAIL = process.env.POCKETBASE_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_PASSWORD;
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/funds_test";
const DRY_RUN = process.argv.includes("--dry");

if (!PB_URL) {
  console.error("POCKETBASE_URL env var is required");
  process.exit(1);
}

// ─── PocketBase helpers ──────────────────────────────────────────────────────

interface PBRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

let pbToken: string | null = null;

async function authAsSuperuser(): Promise<string | null> {
  if (!PB_EMAIL || !PB_PASSWORD) {
    console.warn("POCKETBASE_EMAIL/PASSWORD not set — user-scoped records will be empty");
    return null;
  }
  const payload = JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD });
  // PB 0.23+ renamed admins → _superusers.
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
  });
  if (res.ok) {
    const body = (await res.json()) as { token: string };
    console.log("Authenticated to PocketBase (superuser).");
    return body.token;
  }
  const legacy = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
  });
  if (legacy.ok) {
    const body = (await legacy.json()) as { token: string };
    console.log("Authenticated to PocketBase (admin).");
    return body.token;
  }
  console.warn("PocketBase auth failed — user-scoped records will be empty");
  return null;
}

async function pbList<T extends PBRecord>(collection: string): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const res = await fetch(
      `${PB_URL}/api/collections/${collection}/records?page=${page}&perPage=${perPage}`,
      { headers: pbToken ? { authorization: `Bearer ${pbToken}` } : {} },
    );
    if (!res.ok) {
      console.warn(`[pb] ${collection}: HTTP ${res.status} — skipping`);
      return all;
    }
    const body = (await res.json()) as { items: T[]; totalItems: number };
    all.push(...body.items);
    if (all.length >= body.totalItems) break;
    page++;
  }
  return all;
}

// ─── PB record shapes ────────────────────────────────────────────────────────

interface PBUser extends PBRecord {
  email: string;
  username: string;
  currency?: { code?: string; name?: string; symbol?: string } | null;
}

interface PBBank extends PBRecord {
  user: string;
  name: string;
  balance: number;
  primaryColor?: string;
  secondaryColor?: string;
}

interface PBCategory extends PBRecord {
  user: string;
  name: string;
  hideable: boolean;
  monthly_budget?: number | null;
}

interface PBTransaction extends PBRecord {
  user: string;
  description: string;
  type: "income" | "expense" | "deposit" | "withdrawal";
  amount: number;
  bank: string;
  categories: string[];
  date: string;
}

interface PBPlannedTransaction extends PBRecord {
  user: string;
  name: string;
  description: string;
  type: "income" | "expense" | "deposit" | "withdrawal";
  amount: number;
  bank: string;
  categories: string[];
  recurrence: { frequency: string; interval?: number } | null;
  timezone: number | null;
  previousDate: string | null;
  invokeDate: string | null;
  lastNotifiedAt: string | null;
  active: boolean;
  isTemplate: boolean;
}

interface PBToken extends PBRecord {
  user: string;
  name: string;
  symbol: string;
  coingecko_id: string;
}

interface PBTokenTransaction extends PBRecord {
  user: string;
  token: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  total_cost: number;
  date: string;
  note?: string;
}

// ─── Date parsing ────────────────────────────────────────────────────────────

/**
 * Parse a PocketBase date value defensively. PB returns dates as ISO strings,
 * sometimes space-separated ("2026-08-01 00:00:00.000Z"), and uses the Go zero
 * time "0001-01-01T00:00:00.000Z" for unset fields. Returns null when the value
 * is null/empty/zero/invalid instead of throwing.
 */
function parsePbDate(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "number") return new Date(value);
  const s = String(value).trim();
  if (!s || s.startsWith("0001-01-01")) return null;
  const iso = s.includes(" ") ? s.replace(" ", "T") : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Timezone conversion ─────────────────────────────────────────────────────

const OFFSET_TO_IANA: Record<number, string> = {
  "-12": "Etc/GMT+12",
  "-11": "Pacific/Pago_Pago",
  "-10": "Pacific/Honolulu",
  "-9": "America/Anchorage",
  "-8": "America/Los_Angeles",
  "-7": "America/Denver",
  "-6": "America/Chicago",
  "-5": "America/New_York",
  "-4": "America/Halifax",
  "-3": "America/Sao_Paulo",
  "-2": "Atlantic/South_Georgia",
  "-1": "Atlantic/Azores",
  0: "UTC",
  1: "Europe/London",
  2: "Europe/Berlin",
  3: "Europe/Moscow",
  4: "Asia/Dubai",
  5: "Asia/Karachi",
  6: "Asia/Dhaka",
  7: "Asia/Bangkok",
  8: "Asia/Shanghai",
  9: "Asia/Tokyo",
  10: "Australia/Sydney",
  11: "Pacific/Guadalcanal",
  12: "Pacific/Auckland",
};

function offsetToIana(offset: number | null): string {
  if (offset == null) return "UTC";
  return OFFSET_TO_IANA[offset] ?? "UTC";
}

// ─── Money conversion ────────────────────────────────────────────────────────

function floatToMinor(amount: number, decimals: number): bigint {
  const scaled = Math.round(amount * 10 ** decimals);
  return BigInt(scaled);
}

// ─── Per-user clean (idempotent re-runs) ─────────────────────────────────────
// Accounts have no natural key, so a bare re-import duplicates rows. When the
// target user already exists in PG, clear their finance rows first so the PB
// backup stays the single source of truth. Child tables first (FK order).
async function cleanUserData(
  db: ReturnType<typeof drizzle>,
  userId: string,
): Promise<void> {
  for (const t of [
    tokenTransactions,
    transactions,
    trades,
    transfers,
    templates,
    scheduledTransactions,
    tokens,
    categoryBudgets,
    categories,
    accounts,
  ]) {
    await db.delete(t).where(eq(t.userId, userId));
  }
}

// ─── Type collapsing ─────────────────────────────────────────────────────────

function collapseType(t: string): "income" | "expense" {
  if (t === "deposit" || t === "income") return "income";
  return "expense";
}

/** Signed minor units for a PB transaction: expense negative, income positive. */
function signedMinor(amount: number | undefined, type: string): bigint {
  const a = floatToMinor(Math.abs(amount ?? 0), 2);
  return collapseType(type) === "expense" ? -a : a;
}

// ─── CoinGecko rate backfill ─────────────────────────────────────────────────

async function fetchHistory(
  coingeckoId: string,
  vsCurrency: string,
  days: number,
): Promise<{ timestamp: string; price: number }[]> {
  const url = `${"https://api.coingecko.com/api/v3"}/coins/${coingeckoId}/market_chart?vs_currency=${vsCurrency.toLowerCase()}&days=${days}&interval=daily`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { prices: [number, number][] };
    return data.prices.map(([ts, price]) => ({
      timestamp: new Date(ts).toISOString(),
      price,
    }));
  } catch {
    return [];
  }
}

// ─── Per-user migration state ────────────────────────────────────────────────

interface UserImportResult {
  email: string;
  username: string;
  pgUserId: string;
  accounts: number;
  categories: number;
  transactions: number;
  templates: number;
  scheduledTransactions: number;
  tokens: number;
  tokenTransactions: number;
  balanceDiffs: { accountName: string; expected: bigint; actual: bigint }[];
  orphans: number;
}

interface MigrationReport {
  users: UserImportResult[];
  assets: number;
  ratesHistory: number;
}

// ─── Main migration ──────────────────────────────────────────────────────────

async function migrate(): Promise<MigrationReport> {
  const report: MigrationReport = { users: [], assets: 0, ratesHistory: 0 };

  pbToken = await authAsSuperuser();

  console.log("Fetching PocketBase records...");
  const [pbUsers, pbBanks, pbCategories, pbTransactions, pbPlanned, pbTokens, pbTokenTxns] =
    await Promise.all([
      pbList<PBUser>("users"),
      pbList<PBBank>("banks"),
      pbList<PBCategory>("categories"),
      pbList<PBTransaction>("transactions"),
      pbList<PBPlannedTransaction>("planned_transactions"),
      pbList<PBToken>("tokens"),
      pbList<PBTokenTransaction>("token_transactions"),
    ]);

  console.log(
    `PB records: ${pbUsers.length} users, ${pbBanks.length} banks, ` +
      `${pbCategories.length} categories, ${pbTransactions.length} txns, ` +
      `${pbPlanned.length} planned, ${pbTokens.length} tokens, ${pbTokenTxns.length} token txns`,
  );

  if (pbUsers.length === 0) {
    console.error("No users found — nothing to migrate.");
    process.exit(1);
  }

  const { Pool } = pg;
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  // ── Global assets (shared across users) ──────────────────────────────────
  const fiatAssets: Record<string, string> = {};
  const cryptoAssets: Record<string, string> = {};

  const ensureAsset = async (code: string, kind: "fiat" | "crypto", name: string, coingeckoId?: string): Promise<string> => {
    const existing = await db.select().from(assets).where(eq(assets.code, code)).limit(1);
    if (existing.length > 0 && existing[0]) return existing[0].id;
    const id = ulid();
    if (!DRY_RUN) {
      await db.insert(assets).values({
        id,
        kind,
        code,
        name,
        coingeckoId,
        decimals: kind === "crypto" ? 8 : code === "JPY" ? 0 : 2,
      });
    }
    report.assets++;
    return id;
  };

  const fiatList = [
    { code: "USD", name: "US Dollar" },
    { code: "PHP", name: "Philippine Peso" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound" },
    { code: "JPY", name: "Japanese Yen" },
  ];
  for (const f of fiatList) {
    fiatAssets[f.code] = await ensureAsset(f.code, "fiat", f.name);
  }
  const defaultFiatId = fiatAssets["USD"]!;

  // Group records by owner.
  const byUser = <T extends { user: string }>(rows: T[]): Map<string, T[]> => {
    const map = new Map<string, T[]>();
    for (const r of rows) {
      const bucket = map.get(r.user) ?? [];
      bucket.push(r);
      map.set(r.user, bucket);
    }
    return map;
  };
  const banksByUser = byUser(pbBanks);
  const catsByUser = byUser(pbCategories);
  const txnsByUser = byUser(pbTransactions);
  const plannedByUser = byUser(pbPlanned);
  const tokensByUser = byUser(pbTokens);
  const tokenTxnsByUser = byUser(pbTokenTxns);

  // ── Import each PocketBase user separately ───────────────────────────────
  const orderedUsers = [...pbUsers].sort((a, b) => a.created.localeCompare(b.created));

  for (const pbUser of orderedUsers) {
    const email = pbUser.email ?? `migrated-${pbUser.id}@funds.local`;
    const username = pbUser.username ?? `user-${pbUser.id.slice(0, 8)}`;
    const result: UserImportResult = {
      email,
      username,
      pgUserId: "",
      accounts: 0,
      categories: 0,
      transactions: 0,
      templates: 0,
      scheduledTransactions: 0,
      tokens: 0,
      tokenTransactions: 0,
      balanceDiffs: [],
      orphans: 0,
    };

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    let pgUserId: string;
    if (existingUser.length > 0 && existingUser[0]) {
      pgUserId = existingUser[0].id;
      if (!DRY_RUN) {
        console.log(`  ${email}: re-import — clearing previous data`);
        await cleanUserData(db, pgUserId);
      }
    } else {
      pgUserId = ulid();
      if (!DRY_RUN) {
        await db.insert(users).values({
          id: pgUserId,
          email,
          name: username,
          username,
          emailVerified: true,
        });
      }
    }
    result.pgUserId = pgUserId;

    // User currency → asset. PB users.currency is {code,name,symbol}; fall back
    // to PHP when absent (the user's own default).
    const pbCurrency = pbUser.currency ?? null;
    const currencyCode = (pbCurrency?.code ?? "").toUpperCase();
    let userFiatId: string;
    if (currencyCode && fiatAssets[currencyCode]) {
      userFiatId = fiatAssets[currencyCode]!;
    } else if (currencyCode) {
      userFiatId = await ensureAsset(currencyCode, "fiat", pbCurrency?.name ?? currencyCode);
    } else {
      userFiatId = fiatAssets["PHP"]!;
    }

    const userBanks = banksByUser.get(pbUser.id) ?? [];
    const userCats = catsByUser.get(pbUser.id) ?? [];
    const userTxns = txnsByUser.get(pbUser.id) ?? [];
    const userPlanned = plannedByUser.get(pbUser.id) ?? [];
    const userTokens = tokensByUser.get(pbUser.id) ?? [];
    const userTokenTxns = tokenTxnsByUser.get(pbUser.id) ?? [];

    // Banks → accounts (asset = user's currency; PB banks carry no currency).
    //
    // PB `banks.balance` is the CURRENT balance, and the txn log sums to it —
    // so opening_balance must be the residual (balance − Σ txns), not the full
    // balance, or every account double-counts and net worth inflates 2×.
    const txnSumByBank = new Map<string, bigint>();
    for (const txn of userTxns) {
      txnSumByBank.set(txn.bank, (txnSumByBank.get(txn.bank) ?? 0n) + signedMinor(txn.amount, txn.type));
    }
    const accountByPbBankId = new Map<string, string>();
    const bankBalanceSum = new Map<string, bigint>();
    const pbBalanceByAccount = new Map<string, bigint>();
    for (const bank of userBanks) {
      const accountId = ulid();
      accountByPbBankId.set(bank.id, accountId);
      bankBalanceSum.set(accountId, 0n);
      const stated = floatToMinor(bank.balance ?? 0, 2);
      pbBalanceByAccount.set(accountId, stated);
      const opening = stated - (txnSumByBank.get(bank.id) ?? 0n);
      if (!DRY_RUN) {
        await db.insert(accounts).values({
          id: accountId,
          userId: pgUserId,
          name: bank.name,
          kind: "bank",
          assetId: userFiatId,
          openingBalanceMinor: opening,
          colors:
            bank.primaryColor || bank.secondaryColor
              ? { primary_color: bank.primaryColor, secondary_color: bank.secondaryColor }
              : null,
        });
      }
      result.accounts++;
    }

    // Categories.
    const categoryByPbCatId = new Map<string, string>();
    const pgCategoryIds: string[] = [];
    for (const cat of userCats) {
      const catId = ulid();
      categoryByPbCatId.set(cat.id, catId);
      pgCategoryIds.push(catId);
      if (!DRY_RUN) {
        await db.insert(categories).values({
          id: catId,
          userId: pgUserId,
          name: cat.name,
          hideable: cat.hideable,
          assetId: userFiatId,
          monthlyBudgetMinor: cat.monthly_budget != null ? floatToMinor(cat.monthly_budget, 2) : null,
        });
      }
      result.categories++;
    }

    // Transactions.
    for (const txn of userTxns) {
      const pgType = collapseType(txn.type);
      const signedAmount = signedMinor(txn.amount, txn.type);
      const acctId = accountByPbBankId.get(txn.bank);
      if (acctId) {
        bankBalanceSum.set(acctId, (bankBalanceSum.get(acctId) ?? 0n) + signedAmount);
      }
      const resolvedCatIds = (txn.categories ?? [])
        .map((cid) => categoryByPbCatId.get(cid))
        .filter((id): id is string => id != null);
      const txnDate = parsePbDate(txn.date) ?? parsePbDate(txn.created) ?? new Date();
      if (!DRY_RUN) {
        await db.insert(transactions).values({
          id: ulid(),
          userId: pgUserId,
          accountId: acctId ?? "",
          assetId: userFiatId,
          amountMinor: signedAmount,
          type: pgType,
          description: txn.description ?? "",
          categoryIds: resolvedCatIds,
          date: txnDate,
        });
      }
      result.transactions++;
    }

    // Planned → templates + scheduled.
    for (const pt of userPlanned) {
      const pgType = collapseType(pt.type);
      const amount = floatToMinor(Math.abs(pt.amount ?? 0), 2);
      const signedAmount = pgType === "expense" ? -amount : amount;
      const acctId = accountByPbBankId.get(pt.bank) ?? "";
      const resolvedCatIds = (pt.categories ?? [])
        .map((cid) => categoryByPbCatId.get(cid))
        .filter((id): id is string => id != null);
      if (pt.isTemplate) {
        if (!DRY_RUN) {
          await db.insert(templates).values({
            id: ulid(),
            userId: pgUserId,
            name: pt.name,
            type: pgType,
            amountMinor: signedAmount,
            description: pt.description ?? "",
            accountId: acctId,
            categoryIds: resolvedCatIds,
          });
        }
        result.templates++;
      } else {
        if (!DRY_RUN) {
          await db.insert(scheduledTransactions).values({
            id: ulid(),
            userId: pgUserId,
            name: pt.name,
            description: pt.description ?? "",
            type: pgType,
            amountMinor: signedAmount,
            accountId: acctId,
            categoryIds: resolvedCatIds,
            recurrence: pt.recurrence
              ? {
                  frequency: pt.recurrence.frequency as "daily" | "weekly" | "monthly" | "yearly",
                  interval: pt.recurrence.interval ?? 1,
                }
              : null,
            timezone: offsetToIana(pt.timezone),
            invokeDate: parsePbDate(pt.invokeDate),
            previousDate: parsePbDate(pt.previousDate),
            lastNotifiedAt: parsePbDate(pt.lastNotifiedAt),
            active: pt.active,
          });
        }
        result.scheduledTransactions++;
      }
    }

    // Tokens → crypto assets (global, for rates) + per-user `tokens` rows +
    // `token_transactions` ledger so holdings show in the crypto tab.
    const tokenByPbId = new Map<string, string>();
    for (const tok of userTokens) {
      const sym = (tok.symbol ?? "").toUpperCase();
      if (sym && !cryptoAssets[sym]) {
        cryptoAssets[sym] = await ensureAsset(sym, "crypto", tok.name, tok.coingecko_id);
      }
      const tokenId = ulid();
      tokenByPbId.set(tok.id, tokenId);
      if (!DRY_RUN) {
        await db.insert(tokens).values({
          id: tokenId,
          userId: pgUserId,
          symbol: sym,
          name: tok.name,
          coingeckoId: tok.coingecko_id,
          decimals: 8,
        });
      }
      result.tokens++;
    }
    for (const tt of userTokenTxns) {
      const tokenId = tokenByPbId.get(tt.token);
      if (!tokenId) continue;
      const ts = parsePbDate(tt.date) ?? parsePbDate(tt.created) ?? new Date();
      if (!DRY_RUN) {
        await db.insert(tokenTransactions).values({
          id: ulid(),
          userId: pgUserId,
          tokenId,
          amountMinor: floatToMinor(Math.abs(tt.amount ?? 0), 8),
          priceAtExecutionMinor: floatToMinor(Math.abs(tt.price ?? 0), 8),
          feeMinor: 0n,
          side: tt.type === "sell" ? "sell" : "buy",
          timestamp: ts,
        });
      }
      result.tokenTransactions++;
    }

    // Per-user validation.
    if (!DRY_RUN) {
      for (const [accountId, sum] of bankBalanceSum) {
        const pbBalance = pbBalanceByAccount.get(accountId) ?? 0n;
        if (sum !== pbBalance) {
          const acct = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
          result.balanceDiffs.push({
            accountName: acct[0]?.name ?? accountId,
            expected: pbBalance,
            actual: sum,
          });
        }
      }
      const allTxns = await db.select().from(transactions).where(eq(transactions.userId, pgUserId));
      for (const txn of allTxns) {
        const catIds = (txn.categoryIds as string[]) ?? [];
        for (const cid of catIds) if (!pgCategoryIds.includes(cid)) result.orphans++;
      }
    }

    report.users.push(result);
    console.log(
      `→ ${email}: ${result.accounts} accounts, ${result.categories} categories, ` +
        `${result.transactions} txns, ${result.templates} templates, ` +
        `${result.scheduledTransactions} scheduled, ${result.tokens} tokens, ` +
        `${result.tokenTransactions} token txns`,
    );
  }

  // ── CoinGecko history backfill (crypto assets, global) ───────────────────
  if (!DRY_RUN) {
    for (const [sym, assetId] of Object.entries(cryptoAssets)) {
      const pbTok = pbTokens.find((t) => (t.symbol ?? "").toUpperCase() === sym);
      if (!pbTok?.coingecko_id) continue;
      console.log(`Fetching CoinGecko history for ${sym} ...`);
      const history = await fetchHistory(pbTok.coingecko_id, "USD", 365);
      for (const entry of history) {
        await db.insert(ratesHistory).values({
          id: ulid(),
          assetId,
          vsAssetId: defaultFiatId,
          priceMinorScaled: BigInt(Math.round(entry.price * 1e8)),
          fetchedAt: new Date(entry.timestamp),
        });
        report.ratesHistory++;
      }
      await new Promise((r) => setTimeout(r, 6500));
    }
  }

  await pool.end();
  return report;
}

// ─── CLI entry point ─────────────────────────────────────────────────────────

console.log(`\nFunds PB → PG Migration ${DRY_RUN ? "(DRY RUN)" : ""}\n`);

migrate()
  .then((report) => {
    console.log("\n═══════════════════════════════════════════════════");
    console.log(" Migration Report");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Users:                ${report.users.length}`);
    console.log(`  Assets (global):      ${report.assets}`);
    console.log(`  Rates History Rows:   ${report.ratesHistory}`);
    console.log("───────────────────────────────────────────────────");
    for (const u of report.users) {
      console.log(`  ${u.email}`);
      console.log(
        `    accounts: ${u.accounts} · categories: ${u.categories} · txns: ${u.transactions}`,
      );
      console.log(
        `    templates: ${u.templates} · scheduled: ${u.scheduledTransactions} · tokens: ${u.tokens} · token txns: ${u.tokenTransactions}`,
      );
      if (u.balanceDiffs.length > 0) {
        for (const d of u.balanceDiffs) {
          console.log(`    ⚠ ${d.accountName}: PB balance ${d.expected}, txn sum ${d.actual}`);
        }
      } else {
        console.log("    ✓ bank balances match transaction sums");
      }
      if (u.orphans > 0) console.log(`    ⚠ orphaned category references: ${u.orphans}`);
      else console.log("    ✓ no orphaned category references");
    }
    console.log("═══════════════════════════════════════════════════");
    console.log(`\n  ${DRY_RUN ? "DRY RUN — no data was written." : "Migration complete."}\n`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

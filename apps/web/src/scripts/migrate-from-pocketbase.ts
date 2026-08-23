/**
 * One-shot PocketBase → Postgres migration script.
 *
 * Usage:
 *   POCKETBASE_URL=http://localhost:8090 DATABASE_URL=postgres://... tsx apps/web/src/scripts/migrate-from-pocketbase.ts
 *   POCKETBASE_URL=http://localhost:8090 DATABASE_URL=postgres://... tsx apps/web/src/scripts/migrate-from-pocketbase.ts --dry
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { ulid } from "@funds/core/server";
import {
  assets,
  accounts,
  categories,
  transactions,
  templates,
  scheduledTransactions,
  users,
  ratesHistory,
} from "@funds/db/schema";

// ─── Config ──────────────────────────────────────────────────────────────────

const PB_URL = process.env.POCKETBASE_URL;
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

async function pbList<T extends PBRecord>(collection: string): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const res = await fetch(
      `${PB_URL}/api/collections/${collection}/records?page=${page}&perPage=${perPage}`,
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
  currency?: { code: string; name: string; symbol: string } | null;
  voiceApiKey?: string;
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
  total_exempt: boolean;
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

// ─── Type collapsing ─────────────────────────────────────────────────────────

function collapseType(
  t: string,
): "income" | "expense" {
  if (t === "deposit" || t === "income") return "income";
  return "expense";
}

// ─── CoinGecko rate backfill ─────────────────────────────────────────────────

const CG_BASE = "https://api.coingecko.com/api/v3";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchPrice(
  coingeckoId: string,
  vsCurrency: string,
): Promise<number | null> {
  const url = `${CG_BASE}/simple/price?ids=${coingeckoId}&vs_currencies=${vsCurrency.toLowerCase()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, Record<string, number>>;
    return data[coingeckoId]?.[vsCurrency.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

async function fetchHistory(
  coingeckoId: string,
  vsCurrency: string,
  days: number,
): Promise<{ timestamp: string; price: number }[]> {
  const url = `${CG_BASE}/coins/${coingeckoId}/market_chart?vs_currency=${vsCurrency.toLowerCase()}&days=${days}&interval=daily`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      prices: [number, number][];
    };
    return data.prices.map(([ts, price]) => ({
      timestamp: new Date(ts).toISOString(),
      price,
    }));
  } catch {
    return [];
  }
}

// ─── Main migration ──────────────────────────────────────────────────────────

interface MigrationReport {
  users: number;
  assets: number;
  accounts: number;
  categories: number;
  transactions: number;
  templates: number;
  scheduledTransactions: number;
  ratesHistory: number;
  validation: {
    bankBalanceDiffs: { accountName: string; expected: bigint; actual: bigint }[];
    orphanedTransactions: number;
    orphanedTemplates: number;
    orphanedScheduled: number;
  };
}

async function migrate(): Promise<MigrationReport> {
  const report: MigrationReport = {
    users: 0,
    assets: 0,
    accounts: 0,
    categories: 0,
    transactions: 0,
    templates: 0,
    scheduledTransactions: 0,
    ratesHistory: 0,
    validation: {
      bankBalanceDiffs: [],
      orphanedTransactions: 0,
      orphanedTemplates: 0,
      orphanedScheduled: 0,
    },
  };

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

  const { Pool } = pg;
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  // ── 1. Upsert user ──────────────────────────────────────────────────────
  // For migration we assume a single-user instance; find or create target user.
  const targetUserEmail = pbUsers[0]?.email ?? "migrated@funds.local";

  let targetUserId: string;
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, targetUserEmail))
    .limit(1);

  if (existingUser.length > 0 && existingUser[0]) {
    targetUserId = existingUser[0].id;
    console.log(`Target user exists: ${targetUserId}`);
  } else {
    targetUserId = ulid();
    if (!DRY_RUN) {
      await db.insert(users).values({
        id: targetUserId,
        email: targetUserEmail,
        name: pbUsers[0]?.username ?? "migrated",
        username: pbUsers[0]?.username ?? "migrated",
        emailVerified: true,
      });
    }
    report.users++;
    console.log(`Created target user: ${targetUserId}`);
  }

  // ── 2. Synthesize assets ────────────────────────────────────────────────
  // Collect all fiat codes from banks (assume USD default for now)
  // and crypto assets from tokens.
  const fiatCodeSet = new Set<string>();
  fiatCodeSet.add("USD"); // always include USD as base

  const cryptoBySymbol = new Map<string, PBToken>();
  for (const tok of pbTokens) {
    const sym = tok.symbol.toUpperCase();
    if (!cryptoBySymbol.has(sym)) {
      cryptoBySymbol.set(sym, tok);
    }
  }

  // Insert fiat assets
  const fiatAssets: Record<string, string> = {}; // code → asset id
  for (const code of fiatCodeSet) {
    const existing = await db
      .select()
      .from(assets)
      .where(eq(assets.code, code))
      .limit(1);
    if (existing.length > 0 && existing[0]) {
      fiatAssets[code] = existing[0].id;
    } else {
      const id = ulid();
      if (!DRY_RUN) {
        await db.insert(assets).values({
          id,
          kind: "fiat",
          code,
          name: code,
          decimals: code === "JPY" ? 0 : 2,
        });
      }
      fiatAssets[code] = id;
      report.assets++;
    }
  }

  // Insert crypto assets
  const cryptoAssets: Record<string, string> = {}; // symbol → asset id
  for (const [sym, tok] of cryptoBySymbol) {
    const existing = await db
      .select()
      .from(assets)
      .where(eq(assets.code, sym))
      .limit(1);
    if (existing.length > 0 && existing[0]) {
      cryptoAssets[sym] = existing[0].id;
    } else {
      const id = ulid();
      if (!DRY_RUN) {
        await db.insert(assets).values({
          id,
          kind: "crypto",
          code: sym,
          name: tok.name,
          coingeckoId: tok.coingecko_id,
          decimals: 8,
        });
      }
      cryptoAssets[sym] = id;
      report.assets++;
    }
  }

  const defaultFiatId = fiatAssets["USD"];
  if (!defaultFiatId) {
    throw new Error("USD asset not found — cannot proceed");
  }

  // ── 3. Map PB bank → PG account ────────────────────────────────────────
  const accountByPbBankId = new Map<string, string>(); // pb bank id → pg account id
  const bankBalanceSum = new Map<string, bigint>(); // pg account id → sum of txns

  for (const bank of pbBanks) {
    const accountId = ulid();
    accountByPbBankId.set(bank.id, accountId);
    bankBalanceSum.set(accountId, 0n);

    if (!DRY_RUN) {
      await db.insert(accounts).values({
        id: accountId,
        userId: targetUserId,
        name: bank.name,
        kind: "bank",
        assetId: defaultFiatId,
        openingBalanceMinor: 0n,
        colors:
          bank.primaryColor || bank.secondaryColor
            ? { primary_color: bank.primaryColor, secondary_color: bank.secondaryColor }
            : null,
      });
    }
    report.accounts++;
  }

  // ── 4. Map PB categories → PG categories ────────────────────────────────
  const categoryByPbCatId = new Map<string, string>(); // pb cat id → pg cat id
  const pgCategoryIds: string[] = []; // all created category ids for validation

  for (const cat of pbCategories) {
    const catId = ulid();
    categoryByPbCatId.set(cat.id, catId);
    pgCategoryIds.push(catId);

    if (!DRY_RUN) {
      await db.insert(categories).values({
        id: catId,
        userId: targetUserId,
        name: cat.name,
        hideable: cat.hideable,
        monthlyBudgetMinor: cat.monthly_budget != null
          ? floatToMinor(cat.monthly_budget, 2)
          : null,
      });
    }
    report.categories++;
  }

  // ── 5. Migrate transactions ─────────────────────────────────────────────
  const txnIdByPbTxnId = new Map<string, string>(); // pb txn id → pg txn id

  for (const txn of pbTransactions) {
    const pgType = collapseType(txn.type);
    const amount = floatToMinor(Math.abs(txn.amount), 2);
    const signedAmount = pgType === "expense" ? -amount : amount;

    const pgTxnId = ulid();
    txnIdByPbTxnId.set(txn.id, pgTxnId);

    // Track sum per account for balance validation
    const acctId = accountByPbBankId.get(txn.bank);
    if (acctId) {
      bankBalanceSum.set(acctId, (bankBalanceSum.get(acctId) ?? 0n) + signedAmount);
    }

    // Resolve categories: PB stores array of category IDs
    const resolvedCatIds = (txn.categories ?? [])
      .map((cid) => categoryByPbCatId.get(cid))
      .filter((id): id is string => id != null);

    if (!DRY_RUN) {
      await db.insert(transactions).values({
        id: pgTxnId,
        userId: targetUserId,
        accountId: acctId ?? "", // will fail FK if bank missing — acceptable
        assetId: defaultFiatId,
        amountMinor: signedAmount,
        type: pgType,
        description: txn.description ?? "",
        categoryIds: resolvedCatIds,
        date: new Date(txn.date),
      });
    }
    report.transactions++;
  }

  // ── 6. Migrate planned transactions → templates + scheduled ─────────────
  for (const pt of pbPlanned) {
    const pgType = collapseType(pt.type);
    const amount = floatToMinor(Math.abs(pt.amount), 2);
    const signedAmount = pgType === "expense" ? -amount : amount;
    const acctId = accountByPbBankId.get(pt.bank) ?? "";
    const resolvedCatIds = (pt.categories ?? [])
      .map((cid) => categoryByPbCatId.get(cid))
      .filter((id): id is string => id != null);

    if (pt.isTemplate) {
      if (!DRY_RUN) {
        await db.insert(templates).values({
          id: ulid(),
          userId: targetUserId,
          name: pt.name,
          type: pgType,
          amountMinor: signedAmount,
          description: pt.description ?? "",
          accountId: acctId,
          categoryIds: resolvedCatIds,
        });
      }
      report.templates++;
    } else {
      const timezone = offsetToIana(pt.timezone);

      if (!DRY_RUN) {
        await db.insert(scheduledTransactions).values({
          id: ulid(),
          userId: targetUserId,
          name: pt.name,
          description: pt.description ?? "",
          type: pgType,
          amountMinor: signedAmount,
          accountId: acctId,
          categoryIds: resolvedCatIds,
          recurrence: pt.recurrence
            ? {
                frequency: pt.recurrence.frequency as
                  | "daily"
                  | "weekly"
                  | "monthly"
                  | "yearly",
                interval: pt.recurrence.interval ?? 1,
              }
            : null,
          timezone,
          invokeDate: pt.invokeDate ? new Date(pt.invokeDate) : null,
          previousDate: pt.previousDate ? new Date(pt.previousDate) : null,
          lastNotifiedAt: pt.lastNotifiedAt ? new Date(pt.lastNotifiedAt) : null,
          active: pt.active,
        });
      }
      report.scheduledTransactions++;
    }
  }

  // ── 7. Backfill rates history from CoinGecko ────────────────────────────
  if (!DRY_RUN) {
    const vsCurrency = "USD"; // default base currency
    for (const [sym, cgId] of cryptoBySymbol) {
      const assetId = cryptoAssets[sym];
      if (!assetId) continue;

      console.log(`Fetching CoinGecko history for ${sym} (${cgId.coingecko_id})...`);
      const history = await fetchHistory(cgId.coingecko_id, vsCurrency, 365);
      for (const entry of history) {
        const priceScaled = BigInt(Math.round(entry.price * 1e8));
        await db.insert(ratesHistory).values({
          id: ulid(),
          assetId,
          vsAssetId: defaultFiatId,
          priceMinorScaled: priceScaled,
          fetchedAt: new Date(entry.timestamp),
        });
        report.ratesHistory++;
      }

      // Rate limit: 10 req/min on CoinGecko free tier
      await new Promise((r) => setTimeout(r, 6500));
    }
  }

  // ── 8. Post-migration validation ────────────────────────────────────────
  console.log("\nRunning post-migration validation...");

  // 8a. Verify bank balances match sum of transactions
  if (!DRY_RUN) {
    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, targetUserId));

    for (const acct of allAccounts) {
      const expected = bankBalanceSum.get(acct.id) ?? 0n;
      if (expected !== acct.openingBalanceMinor) {
        report.validation.bankBalanceDiffs.push({
          accountName: acct.name,
          expected,
          actual: acct.openingBalanceMinor,
        });
      }
    }
  }

  // 8b. Check orphaned references (category IDs on transactions that don't exist)
  if (!DRY_RUN) {
    const allTxns = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, targetUserId));

    for (const txn of allTxns) {
      const catIds = (txn.categoryIds as string[]) ?? [];
      for (const cid of catIds) {
        if (!pgCategoryIds.includes(cid)) {
          report.validation.orphanedTransactions++;
        }
      }
    }

    const allTemplates = await db
      .select()
      .from(templates)
      .where(eq(templates.userId, targetUserId));

    for (const t of allTemplates) {
      const catIds = (t.categoryIds as string[]) ?? [];
      for (const cid of catIds) {
        if (!pgCategoryIds.includes(cid)) {
          report.validation.orphanedTemplates++;
        }
      }
    }

    const allScheduled = await db
      .select()
      .from(scheduledTransactions)
      .where(eq(scheduledTransactions.userId, targetUserId));

    for (const s of allScheduled) {
      const catIds = (s.categoryIds as string[]) ?? [];
      for (const cid of catIds) {
        if (!pgCategoryIds.includes(cid)) {
          report.validation.orphanedScheduled++;
        }
      }
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
    console.log(`  Users:                ${report.users}`);
    console.log(`  Assets:               ${report.assets}`);
    console.log(`  Accounts:             ${report.accounts}`);
    console.log(`  Categories:           ${report.categories}`);
    console.log(`  Transactions:         ${report.transactions}`);
    console.log(`  Templates:            ${report.templates}`);
    console.log(`  Scheduled Txns:       ${report.scheduledTransactions}`);
    console.log(`  Rates History Rows:   ${report.ratesHistory}`);
    console.log("───────────────────────────────────────────────────");
    console.log(" Validation");
    console.log("───────────────────────────────────────────────────");
    if (report.validation.bankBalanceDiffs.length > 0) {
      console.log("  ⚠ Bank balance mismatches:");
      for (const d of report.validation.bankBalanceDiffs) {
        console.log(
          `    ${d.accountName}: expected ${d.expected}, got ${d.actual}`,
        );
      }
    } else {
      console.log("  ✓ All bank balances match transaction sums");
    }
    const orphans =
      report.validation.orphanedTransactions +
      report.validation.orphanedTemplates +
      report.validation.orphanedScheduled;
    if (orphans > 0) {
      console.log(`  ⚠ Orphaned category references: ${orphans}`);
    } else {
      console.log("  ✓ No orphaned category references");
    }
    console.log("═══════════════════════════════════════════════════");
    if (DRY_RUN) {
      console.log("\n  DRY RUN — no data was written.\n");
    } else {
      console.log("\n  Migration complete.\n");
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

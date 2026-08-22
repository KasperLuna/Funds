import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import {
  assets,
  users,
  accounts,
  categories,
  transactions,
  transfers,
  trades,
  templates,
  scheduledTransactions,
  pushSubscriptions,
  voiceDrafts,
  rates,
  ratesHistory,
} from "./schema.js";
import { newId } from "./id.js";
import { first } from "./test-utils.js";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:54329/funds_test";

describe("schema round-trip tests", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    db = drizzle(pool);

    // Apply migrations
    await migrate(db, { migrationsFolder: "./drizzle" });
    
    // Clean slate before tests
    await db.delete(ratesHistory);
    await db.delete(rates);
    await db.delete(voiceDrafts);
    await db.delete(pushSubscriptions);
    await db.delete(scheduledTransactions);
    await db.delete(templates);
    await db.delete(transactions);
    await db.delete(trades);
    await db.delete(transfers);
    await db.delete(categories);
    await db.delete(accounts);
    await pool.query('UPDATE users SET base_asset_id = NULL');
    await db.delete(users);
    await db.delete(assets);
  });

  afterEach(async () => {
    // Clean up all tables in reverse dependency order
    await db.delete(ratesHistory);
    await db.delete(rates);
    await db.delete(voiceDrafts);
    await db.delete(pushSubscriptions);
    await db.delete(scheduledTransactions);
    await db.delete(templates);
    await db.delete(transactions);
    await db.delete(trades);
    await db.delete(transfers);
    await db.delete(categories);
    await db.delete(accounts);
    
    // Update users to clear base_asset_id foreign key before deleting assets
    await pool.query('UPDATE users SET base_asset_id = NULL');
    
    await db.delete(users);
    await db.delete(assets);
  });

  it("should insert and select assets", async () => {
    const asset = {
      kind: "fiat" as const,
      code: "USD",
      name: "US Dollar",
      coingeckoId: null,
      decimals: 2,
    };

    const inserted = first(await db.insert(assets).values(asset).returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.id).toHaveLength(26);
    expect(inserted.kind).toBe(asset.kind);
    expect(inserted.code).toBe(asset.code);
    expect(inserted.name).toBe(asset.name);
    expect(inserted.coingeckoId).toBeNull();
    expect(inserted.decimals).toBe(asset.decimals);
  });

  it("should insert and select users", async () => {
    const asset = first(await db
      .insert(assets)
      .values({
        kind: "fiat",
        code: "USD",
        name: "US Dollar",
        decimals: 2,
      })
      .returning());

    const user = {
      email: "test@example.com",
      username: "testuser",
      baseAssetId: asset.id,
      timezone: "America/New_York",
      voiceApiKeyHash: null,
      verified: true,
    };

    const inserted = first(await db.insert(users).values(user).returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.id).toHaveLength(26);
    expect(inserted.email).toBe(user.email);
    expect(inserted.username).toBe(user.username);
    expect(inserted.baseAssetId).toBe(asset.id);
    expect(inserted.timezone).toBe(user.timezone);
    expect(inserted.verified).toBe(true);
    expect(inserted.createdAt).toBeInstanceOf(Date);
    expect(inserted.updatedAt).toBeInstanceOf(Date);
  });

  it("should insert and select accounts", async () => {
    const asset = first(await db
      .insert(assets)
      .values({ kind: "fiat", code: "USD", name: "US Dollar", decimals: 2 })
      .returning());

    const user = first(await db
      .insert(users)
      .values({ email: "test@example.com", username: "testuser" })
      .returning());

    const account = {
      userId: user.id,
      name: "Checking",
      kind: "bank" as const,
      assetId: asset.id,
      openingBalanceMinor: 100000n,
      colors: { primary_color: "#FF0000", secondary_color: "#00FF00" },
      archived: false,
    };

    const inserted = first(await db.insert(accounts).values(account).returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.userId).toBe(user.id);
    expect(inserted.name).toBe(account.name);
    expect(inserted.kind).toBe(account.kind);
    expect(inserted.assetId).toBe(asset.id);
    expect(inserted.openingBalanceMinor).toBe(100000n);
    expect(inserted.colors).toEqual(account.colors);
    expect(inserted.archived).toBe(false);
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("should insert and select categories", async () => {
    const user = first(await db
      .insert(users)
      .values({ email: "test@example.com", username: "testuser" })
      .returning());

    const category = {
      userId: user.id,
      name: "Food",
      hideable: true,
      monthlyBudgetMinor: 50000n,
    };

    const inserted = first(await db.insert(categories).values(category).returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.userId).toBe(user.id);
    expect(inserted.name).toBe(category.name);
    expect(inserted.hideable).toBe(true);
    expect(inserted.monthlyBudgetMinor).toBe(50000n);
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("should insert and select transactions with negative amount (expense)", async () => {
    const asset = first(await db
      .insert(assets)
      .values({ kind: "fiat", code: "USD", name: "US Dollar", decimals: 2 })
      .returning());

    const user = first(await db
      .insert(users)
      .values({ email: "test@example.com", username: "testuser" })
      .returning());

    const account = first(await db
      .insert(accounts)
      .values({
        userId: user.id,
        name: "Checking",
        kind: "bank",
        assetId: asset.id,
      })
      .returning());

    const transaction = {
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      amountMinor: -1500n, // expense
      type: "expense" as const,
      description: "Coffee",
      categoryIds: [],
      date: new Date(),
      valueBaseMinor: null,
      tradeId: null,
      transferId: null,
    };

    const inserted = first(await db
      .insert(transactions)
      .values(transaction)
      .returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.userId).toBe(user.id);
    expect(inserted.accountId).toBe(account.id);
    expect(inserted.assetId).toBe(asset.id);
    expect(inserted.amountMinor).toBe(-1500n);
    expect(inserted.type).toBe("expense");
    expect(inserted.description).toBe("Coffee");
    expect(inserted.categoryIds).toEqual([]);
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("should insert and select transfers", async () => {
    const user = first(await db
      .insert(users)
      .values({ email: "test@example.com", username: "testuser" })
      .returning());

    const transfer = {
      userId: user.id,
      feeTransactionId: null,
    };

    const inserted = first(await db.insert(transfers).values(transfer).returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.userId).toBe(user.id);
    expect(inserted.feeTransactionId).toBeNull();
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("should insert and select trades", async () => {
    const user = first(await db
      .insert(users)
      .values({ email: "test@example.com", username: "testuser" })
      .returning());

    const trade = {
      userId: user.id,
      sellLegId: newId(),
      buyLegId: newId(),
      feeLegId: null,
      rate: "1.5",
      note: "BTC purchase",
    };

    const inserted = first(await db.insert(trades).values(trade).returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.userId).toBe(user.id);
    expect(inserted.sellLegId).toBe(trade.sellLegId);
    expect(inserted.buyLegId).toBe(trade.buyLegId);
    expect(inserted.rate).toBe("1.5");
    expect(inserted.note).toBe("BTC purchase");
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("should insert and select templates", async () => {
    const asset = first(await db
      .insert(assets)
      .values({ kind: "fiat", code: "USD", name: "US Dollar", decimals: 2 })
      .returning());

    const user = first(await db
      .insert(users)
      .values({ email: "test@example.com", username: "testuser" })
      .returning());

    const account = first(await db
      .insert(accounts)
      .values({
        userId: user.id,
        name: "Checking",
        kind: "bank",
        assetId: asset.id,
      })
      .returning());

    const template = {
      userId: user.id,
      name: "Coffee Template",
      type: "expense" as const,
      amountMinor: 500n,
      description: "Morning coffee",
      accountId: account.id,
      categoryIds: [],
    };

    const inserted = first(await db.insert(templates).values(template).returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.userId).toBe(user.id);
    expect(inserted.name).toBe(template.name);
    expect(inserted.type).toBe("expense");
    expect(inserted.amountMinor).toBe(500n);
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("should insert and select scheduled transactions", async () => {
    const asset = first(await db
      .insert(assets)
      .values({ kind: "fiat", code: "USD", name: "US Dollar", decimals: 2 })
      .returning());

    const user = first(await db
      .insert(users)
      .values({ email: "test@example.com", username: "testuser" })
      .returning());

    const account = first(await db
      .insert(accounts)
      .values({
        userId: user.id,
        name: "Checking",
        kind: "bank",
        assetId: asset.id,
      })
      .returning());

    const scheduled = {
      userId: user.id,
      name: "Rent",
      description: "Monthly rent",
      type: "expense" as const,
      amountMinor: 100000n,
      accountId: account.id,
      categoryIds: [],
      recurrence: { frequency: "monthly" as const, interval: 1 },
      timezone: "America/New_York",
      invokeDate: new Date(),
      previousDate: null,
      lastNotifiedAt: null,
      active: true,
    };

    const inserted = first(await db
      .insert(scheduledTransactions)
      .values(scheduled)
      .returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.userId).toBe(user.id);
    expect(inserted.name).toBe(scheduled.name);
    expect(inserted.recurrence).toEqual(scheduled.recurrence);
    expect(inserted.timezone).toBe("America/New_York");
    expect(inserted.active).toBe(true);
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("should insert and select push subscriptions", async () => {
    const user = first(await db
      .insert(users)
      .values({ email: "test@example.com", username: "testuser" })
      .returning());

    const subscription = {
      userId: user.id,
      endpoint: "https://example.com/push/123",
      keys: { p256dh: "key1", auth: "key2" },
    };

    const inserted = first(await db
      .insert(pushSubscriptions)
      .values(subscription)
      .returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.userId).toBe(user.id);
    expect(inserted.endpoint).toBe(subscription.endpoint);
    expect(inserted.keys).toEqual(subscription.keys);
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("should insert and select voice drafts", async () => {
    const user = first(await db
      .insert(users)
      .values({ email: "test@example.com", username: "testuser" })
      .returning());

    const draft = {
      userId: user.id,
      token: "token123",
      preview: { amount: "15.00", description: "Coffee" },
      source: "spent 15 on coffee",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    const inserted = first(await db.insert(voiceDrafts).values(draft).returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.userId).toBe(user.id);
    expect(inserted.token).toBe(draft.token);
    expect(inserted.preview).toEqual(draft.preview);
    expect(inserted.source).toBe(draft.source);
    expect(inserted.createdAt).toBeInstanceOf(Date);
    expect(inserted.expiresAt).toBeInstanceOf(Date);
  });

  it("should insert and select rates", async () => {
    const asset1 = first(await db
      .insert(assets)
      .values({ kind: "crypto", code: "BTC", name: "Bitcoin", decimals: 8 })
      .returning());

    const asset2 = first(await db
      .insert(assets)
      .values({ kind: "fiat", code: "USD", name: "US Dollar", decimals: 2 })
      .returning());

    const rate = {
      assetId: asset1.id,
      vsAssetId: asset2.id,
      priceMinorScaled: 5000000000n,
      fetchedAt: new Date(),
    };

    const inserted = first(await db.insert(rates).values(rate).returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.assetId).toBe(asset1.id);
    expect(inserted.vsAssetId).toBe(asset2.id);
    expect(inserted.priceMinorScaled).toBe(5000000000n);
    expect(inserted.fetchedAt).toBeInstanceOf(Date);
  });

  it("should insert and select rates history", async () => {
    const asset1 = first(await db
      .insert(assets)
      .values({ kind: "crypto", code: "BTC", name: "Bitcoin", decimals: 8 })
      .returning());

    const asset2 = first(await db
      .insert(assets)
      .values({ kind: "fiat", code: "USD", name: "US Dollar", decimals: 2 })
      .returning());

    const historyRate = {
      assetId: asset1.id,
      vsAssetId: asset2.id,
      priceMinorScaled: 4900000000n,
      fetchedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };

    const inserted = first(await db
      .insert(ratesHistory)
      .values(historyRate)
      .returning());

    expect(inserted.id).toBeTruthy();
    expect(inserted.assetId).toBe(asset1.id);
    expect(inserted.vsAssetId).toBe(asset2.id);
    expect(inserted.priceMinorScaled).toBe(4900000000n);
    expect(inserted.fetchedAt).toBeInstanceOf(Date);
  });
});

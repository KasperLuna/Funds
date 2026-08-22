import { describe, it, expect, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { assets, users } from "./schema.js";
import { seed } from "./seed.js";
import { first } from "./test-utils.js";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:54329/funds_test";

describe("seed tests", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    db = drizzle(pool);

    // Apply migrations (may already be applied from schema tests)
    try {
      await migrate(db, { migrationsFolder: "./drizzle" });
    } catch {
      // Ignore if already applied
    }

    // Clean slate - clear foreign key first
    await pool.query('UPDATE users SET base_asset_id = NULL');
    await db.delete(users);
    await db.delete(assets);
  });

  it("should seed assets and demo user idempotently", async () => {
    // First seed
    await seed(db);

    const assetsAfterFirstSeed = await db.select().from(assets);
    const usersAfterFirstSeed = await db.select().from(users);

    expect(assetsAfterFirstSeed.length).toBeGreaterThanOrEqual(7); // USD, PHP, EUR, GBP, JPY, BTC, ETH
    expect(usersAfterFirstSeed.length).toBe(1);

    const demoUser = first(usersAfterFirstSeed);
    expect(demoUser.email).toBe("demo@funds.local");
    expect(demoUser.username).toBe("demo");
    expect(demoUser.name).toBe("demo");
    expect(demoUser.emailVerified).toBe(true);

    // Verify USD asset exists and is set as base asset
    const usdAsset = assetsAfterFirstSeed.find((a) => a.code === "USD");
    expect(usdAsset).toBeDefined();
    expect(demoUser.baseAssetId).toBe(usdAsset?.id);

    // Verify crypto assets
    const btc = assetsAfterFirstSeed.find((a) => a.code === "BTC");
    expect(btc).toBeDefined();
    expect(btc?.kind).toBe("crypto");
    expect(btc?.coingeckoId).toBe("bitcoin");
    expect(btc?.decimals).toBe(8);

    const eth = assetsAfterFirstSeed.find((a) => a.code === "ETH");
    expect(eth).toBeDefined();
    expect(eth?.kind).toBe("crypto");
    expect(eth?.coingeckoId).toBe("ethereum");
    expect(eth?.decimals).toBe(8);

    // Second seed (idempotency test)
    await seed(db);

    const assetsAfterSecondSeed = await db.select().from(assets);
    const usersAfterSecondSeed = await db.select().from(users);

    // Counts should be identical
    expect(assetsAfterSecondSeed.length).toBe(assetsAfterFirstSeed.length);
    expect(usersAfterSecondSeed.length).toBe(usersAfterFirstSeed.length);

    // IDs should be identical (no new rows)
    const firstAssetIds = assetsAfterFirstSeed.map((a) => a.id).sort();
    const secondAssetIds = assetsAfterSecondSeed.map((a) => a.id).sort();
    expect(secondAssetIds).toEqual(firstAssetIds);

    expect(first(usersAfterSecondSeed).id).toBe(demoUser.id);
  });
});

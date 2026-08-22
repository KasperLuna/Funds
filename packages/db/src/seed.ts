import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import { assets, users } from "./schema.js";

const { Pool } = pg;

export async function seed(db: ReturnType<typeof drizzle>) {
  // Seed fiat assets
  const fiatAssets = [
    { kind: "fiat" as const, code: "USD", name: "US Dollar", decimals: 2 },
    { kind: "fiat" as const, code: "PHP", name: "Philippine Peso", decimals: 2 },
    { kind: "fiat" as const, code: "EUR", name: "Euro", decimals: 2 },
    { kind: "fiat" as const, code: "GBP", name: "British Pound", decimals: 2 },
    { kind: "fiat" as const, code: "JPY", name: "Japanese Yen", decimals: 0 },
  ];

  for (const asset of fiatAssets) {
    // Check if exists first
    const existing = await db
      .select()
      .from(assets)
      .where(eq(assets.code, asset.code))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(assets).values(asset);
    }
  }

  // Seed crypto assets
  const cryptoAssets = [
    {
      kind: "crypto" as const,
      code: "BTC",
      name: "Bitcoin",
      coingeckoId: "bitcoin",
      decimals: 8,
    },
    {
      kind: "crypto" as const,
      code: "ETH",
      name: "Ethereum",
      coingeckoId: "ethereum",
      decimals: 8,
    },
  ];

  for (const asset of cryptoAssets) {
    // Check if exists first
    const existing = await db
      .select()
      .from(assets)
      .where(eq(assets.code, asset.code))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(assets).values(asset);
    }
  }

  // Look up USD id from DB (not hardcoded)
  const [usdAsset] = await db
    .select()
    .from(assets)
    .where(eq(assets.code, "USD"))
    .limit(1);

  if (!usdAsset) {
    throw new Error("USD asset not found after seeding");
  }

  // Seed demo user
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, "demo@funds.local"))
    .limit(1);
  
  if (existingUser.length === 0) {
    await db.insert(users).values({
      email: "demo@funds.local",
      username: "demo",
      baseAssetId: usdAsset.id,
      verified: true,
    });
  }
}

// CLI entry point
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/seed.ts")
) {
  const DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:54329/funds_test";

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  console.log("Running seed...");
  await seed(db);
  console.log("Seed completed successfully.");

  await pool.end();
  process.exit(0);
}

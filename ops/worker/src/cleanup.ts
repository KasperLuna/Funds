import pg from "pg";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:54329/funds_test";

function log(msg: string) {
  console.log(`[cleanup] ${msg}`);
}

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM voice_drafts WHERE expires_at <= NOW()`,
    );
    log(`Deleted ${rowCount ?? 0} expired voice drafts`);
  } finally {
    await pool.end();
  }
}

// When run directly (not imported), execute immediately
const isMain = process.argv[1]?.includes("cleanup");
if (isMain) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[cleanup] Fatal:", err);
      process.exit(1);
    });
}

export { run as runCleanup };

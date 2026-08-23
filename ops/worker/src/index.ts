import { runReminders } from "./reminders.js";
import { runCleanup } from "./cleanup.js";

function log(msg: string) {
  console.log(`[worker] ${msg}`);
}

const CRON_INTERVAL_MS = 60 * 60_000; // check every hour

async function tick() {
  const now = new Date();
  log(`Tick at ${now.toISOString()}`);
  try {
    await runReminders();
  } catch (err) {
    console.error("[worker] Reminders error:", err);
  }
  try {
    await runCleanup();
  } catch (err) {
    console.error("[worker] Cleanup error:", err);
  }
}

log("Worker started, polling every 60 minutes");
await tick();
setInterval(() => {
  void tick();
}, CRON_INTERVAL_MS);

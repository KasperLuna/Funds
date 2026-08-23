import pg from "pg";
import webPush from "web-push";
import { isDueToday, advanceRecurrence, type Schedule } from "@funds/core";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:54329/funds_test";
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@funds.app";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const DEDUP_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours (logic.md §8.4)

function log(msg: string) {
  console.log(`[reminders] ${msg}`);
}

async function run() {
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const now = new Date();

  try {
    const { rows: scheduled } = await pool.query(
      `SELECT id, user_id, name, description, type, amount_minor, account_id,
              category_ids, recurrence, timezone, invoke_date, previous_date,
              last_notified_at, active
       FROM scheduled_transactions
       WHERE active = true
         AND deleted_at IS NULL
         AND invoke_date IS NOT NULL
         AND recurrence IS NOT NULL`,
    );

    log(`Checking ${scheduled.length} active scheduled transactions`);

    let notified = 0;

    for (const row of scheduled) {
      const schedule: Schedule = {
        frequency: row.recurrence.frequency,
        interval: row.recurrence.interval,
        invokeDate: row.invoke_date ? new Date(row.invoke_date) : null,
        previousDate: row.previous_date ? new Date(row.previous_date) : null,
      };

      // logic.md §8.4: due today in user's local timezone
      if (!isDueToday(schedule, now)) continue;

      // Dedupe: skip if notified within 3h window
      if (row.last_notified_at) {
        const lastNotified = new Date(row.last_notified_at);
        if (now.getTime() - lastNotified.getTime() < DEDUP_WINDOW_MS) {
          continue;
        }
      }

      const { rows: subs } = await pool.query(
        `SELECT endpoint, keys FROM push_subscriptions
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [row.user_id],
      );

      if (subs.length === 0) continue;

      const title = `Log Now: ${row.description || row.name} due today!`;
      const body = "Tap to log this planned transaction.";
      const url = `${APP_URL}?scheduledId=${row.id}`;
      const payload = JSON.stringify({ title, body, url });

      let anyDelivered = false;

      for (const sub of subs) {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload,
          );
          anyDelivered = true;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await pool.query(
              `UPDATE push_subscriptions SET deleted_at = NOW() WHERE endpoint = $1`,
              [sub.endpoint],
            );
          }
        }
      }

      if (anyDelivered) {
        await pool.query(
          `UPDATE scheduled_transactions SET last_notified_at = NOW() WHERE id = $1`,
          [row.id],
        );
        notified++;
      }
    }

    log(`Sent reminders for ${notified} scheduled transactions`);
  } finally {
    await pool.end();
  }
}

const isMain = process.argv[1]?.includes("reminders");
if (isMain) {
  const secret = process.env.CRON_SECRET;
  const authHeader = process.env.CRON_AUTH;
  if (secret && authHeader !== secret) {
    console.error("[reminders] Unauthorized: CRON_AUTH mismatch");
    process.exit(1);
  }
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[reminders] Fatal:", err);
      process.exit(1);
    });
}

export { run as runReminders };

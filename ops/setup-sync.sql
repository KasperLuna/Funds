-- PowerSync logical-replication publication bootstrap (Phase 4, architecture.md §4)
-- Idempotent: only creates the publication when it does not already exist.
-- cavetail: wal_level=logical is set at server start by the postgres compose command,
-- so no ALTER SYSTEM is needed here. Run this AFTER Drizzle migrations (the listed
-- tables must already exist or CREATE PUBLICATION will fail).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    CREATE PUBLICATION powersync
    FOR TABLE accounts, categories, transactions, transfers, trades,
               templates, scheduled_transactions, push_subscriptions;
  END IF;
END
$$;

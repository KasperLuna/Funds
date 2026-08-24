-- PowerSync logical-replication publication bootstrap.
-- Idempotent: only creates the publication when it does not already exist.
-- cavetail: the CI deploy (and ops/deploy.sh) use FOR ALL TABLES so future
-- tables replicate automatically; this file documents the same intent and is
-- kept for manual/bootstrap use. wal_level=logical is set by the postgres
-- compose command, so no ALTER SYSTEM is needed. Run AFTER Drizzle migrations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    CREATE PUBLICATION powersync FOR ALL TABLES;
  END IF;
END
$$;
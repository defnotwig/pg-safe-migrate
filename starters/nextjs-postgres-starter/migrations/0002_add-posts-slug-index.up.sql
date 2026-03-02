-- pgsm-transaction: never
-- This index is created CONCURRENTLY, which requires running outside a transaction.
-- pg-safe-migrate will automatically skip BEGIN/COMMIT for this migration.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_slug ON posts (slug);

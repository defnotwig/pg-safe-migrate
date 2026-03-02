-- Migration: add concurrent index on users.email
-- Safe: uses CONCURRENTLY (auto-detected as non-transactional)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);

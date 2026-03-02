-- Fixture migration 001: create a simple table
-- Used by integration tests and CI

CREATE TABLE IF NOT EXISTS fixture_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

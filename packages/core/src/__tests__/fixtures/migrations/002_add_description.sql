-- Fixture migration 002: add a column

ALTER TABLE fixture_items ADD COLUMN description TEXT NOT NULL DEFAULT '';

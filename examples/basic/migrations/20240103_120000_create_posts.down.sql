-- Rollback: drop posts table
-- pgsm:irreversible reason="Posts data would be lost"
DROP TABLE IF EXISTS posts;

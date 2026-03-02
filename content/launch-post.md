# pg-safe-migrate: Advisory Locks + Drift Detection + Safe Defaults

> A safety-first PostgreSQL migration engine for Node.js.

---

**TL;DR:** pg-safe-migrate is a new open-source migration tool that prevents the three most common Postgres migration incidents: table locks from missing `CONCURRENTLY`, race conditions from concurrent deploys, and silent schema drift from edited migration files.

## The Problem

Every team that runs PostgreSQL in production eventually hits one of these:

1. **The 2am lock incident.** Someone adds an index without `CONCURRENTLY`. The `CREATE INDEX` statement locks the table. Every query queues behind it. The app goes down.

2. **The double-deploy race.** Two CI pipelines trigger simultaneously. Both try to apply the same migration. One fails with a cryptic Postgres error. The migration table is now in an inconsistent state.

3. **The phantom drift.** A developer edits a migration file after it was applied. The database schema no longer matches what the code thinks it is. Bugs appear weeks later with no obvious cause.

These aren't edge cases — they're the top three incident classes in any Postgres post-mortem database.

## What pg-safe-migrate Does

pg-safe-migrate is a Node.js migration engine (CLI + library) that treats these as **first-class failure modes**:

### 10 Built-in Safety Rules

Every migration is linted before it runs. The rules catch the most common mistakes:

```bash
$ npx pg-safe-migrate lint

PGSM003 [ERROR] CREATE INDEX without CONCURRENTLY
  → migrations/0005_add-email-index.up.sql:3
  Fix: Use CREATE INDEX CONCURRENTLY IF NOT EXISTS ...
  Override: -- pgsm:allow PGSM003 reason="small table, <1000 rows"
```

Rules include:
- `PGSM001`: Destructive `DROP TABLE` / `DROP COLUMN`
- `PGSM003`: Index creation without `CONCURRENTLY`
- `PGSM005`: `ALTER TYPE ADD VALUE` inside a transaction (PG limitation)
- `PGSM007`: `SET NOT NULL` without a check constraint (full table scan)
- `PGSM010`: `UPDATE`/`DELETE` without `WHERE` clause

### Advisory Locks

Every migration run acquires a PostgreSQL advisory lock first. If another process is already migrating, the second one waits (or fails fast). No more race conditions.

```typescript
// Under the hood
await client.query('SELECT pg_advisory_lock($1)', [lockId]);
try {
  // ... run migrations
} finally {
  await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
}
```

### SHA-256 Drift Detection

Every applied migration is checksummed. If the file on disk doesn't match what was applied, `check` and `doctor` will catch it:

```bash
$ npx pg-safe-migrate check

✗ Drift detected in 0003_add-posts.up.sql
  Applied checksum: a1b2c3...
  Current checksum: d4e5f6...
  → The migration file was modified after it was applied.
```

### Transaction Policy

Migrations run in transactions by default. But `CONCURRENTLY` can't run in a transaction — so you can opt out per migration:

```sql
-- pgsm-transaction: never
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

### Override System

Every rule can be overridden with a required reason. The reason is recorded in the migration history:

```sql
-- pgsm:allow PGSM001 reason="Removing deprecated feature flag table"
DROP TABLE IF EXISTS feature_flags;
```

## Quick Start

```bash
# Install
npm install -D pg-safe-migrate

# Initialize
npx pg-safe-migrate init

# Create a migration
npx pg-safe-migrate create add-users-table

# Edit the SQL file, then:
npx pg-safe-migrate lint     # Check for safety issues
npx pg-safe-migrate up       # Apply migrations
npx pg-safe-migrate status   # See what's applied
npx pg-safe-migrate doctor   # Full health check
```

## CI Gate

Add one step to your GitHub Actions workflow:

```yaml
- uses: defnotwig/pg-safe-migrate@v1
  with:
    command: check
    database-url: ${{ secrets.DATABASE_URL }}
```

This blocks PRs that introduce unsafe migrations, drift, or ordering issues.

## Comparison

| Feature | pg-safe-migrate | node-pg-migrate | graphile-migrate | dbmate |
|---------|:-:|:-:|:-:|:-:|
| Safety linting | ✅ 10 rules | ❌ | ❌ | ❌ |
| Advisory locks | ✅ | ❌ | ✅ | ❌ |
| Drift detection | ✅ SHA-256 | ❌ | ❌ | ❌ |
| Transaction control | ✅ per-migration | ✅ | ✅ | ✅ |
| Override with audit | ✅ | ❌ | ❌ | ❌ |
| GitHub Action | ✅ | ❌ | ❌ | ❌ |
| Pure SQL migrations | ✅ | ❌ (JS) | ✅ | ✅ |

## Links

- **GitHub:** [github.com/defnotwig/pg-safe-migrate](https://github.com/defnotwig/pg-safe-migrate)
- **npm (CLI):** [npmjs.com/package/pg-safe-migrate](https://www.npmjs.com/package/pg-safe-migrate)
- **npm (Core):** [npmjs.com/package/pg-safe-migrate-core](https://www.npmjs.com/package/pg-safe-migrate-core)
- **Docs:** [github.com/defnotwig/pg-safe-migrate/tree/main/docs](https://github.com/defnotwig/pg-safe-migrate/tree/main/docs)

---

*pg-safe-migrate is MIT licensed and accepts contributions. See the [Contributing guide](https://github.com/defnotwig/pg-safe-migrate/blob/main/CONTRIBUTING.md).*

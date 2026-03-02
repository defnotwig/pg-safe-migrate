# Why CREATE INDEX CONCURRENTLY Breaks Transactions (And How Tools Should Handle It)

> A deep dive into one of PostgreSQL's most common production gotchas.

---

## The Incident

It's 3pm on a Tuesday. Your team deploys a new feature that adds a search index:

```sql
BEGIN;
CREATE INDEX idx_orders_status ON orders (status);
COMMIT;
```

The `orders` table has 50 million rows. The `CREATE INDEX` acquires an **ACCESS EXCLUSIVE** lock on the entire table. Every query — reads included — now waits behind it.

Your API response times spike from 50ms to 30 seconds. Health checks fail. Load balancers pull backends. Your service is down.

The index build takes 4 minutes. For 4 minutes, nothing can read or write the `orders` table.

## What `CONCURRENTLY` Does

PostgreSQL's `CONCURRENTLY` option builds the index without holding an exclusive lock:

```sql
CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);
```

Instead of locking the table, it:

1. Takes a `SHARE UPDATE EXCLUSIVE` lock (allows reads AND writes)
2. Scans the table to build the index
3. Does a second pass to pick up any rows that were modified during step 2
4. Swaps the new index into place

The trade-off: it takes ~2x longer and requires two table scans. But your app stays up.

## The Transaction Problem

Here's the catch. This doesn't work:

```sql
BEGIN;
CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);
COMMIT;
```

PostgreSQL will throw:

```
ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

`CONCURRENTLY` needs to manage its own transaction boundaries internally (it uses multiple transactions for the two-pass build). Wrapping it in `BEGIN/COMMIT` prevents this.

## Why Migration Tools Get This Wrong

Most migration tools wrap every migration in a transaction:

```
BEGIN;
-- your SQL here
COMMIT;
```

This is the safe default — if anything fails, the whole migration rolls back. But it means `CONCURRENTLY` is impossible without special handling.

### The Naive Fix: "Just Don't Use Transactions"

Some tools let you disable transactions globally. This is dangerous — you lose atomicity for *all* migrations.

### The Right Fix: Per-Migration Transaction Control

The correct approach is **per-migration transaction control**. Each migration declares whether it needs a transaction:

```sql
-- pgsm-transaction: never
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders (status);
```

The migration runner reads this directive and skips `BEGIN/COMMIT` for this specific migration, while keeping transactions for everything else.

## What pg-safe-migrate Does

pg-safe-migrate handles this with a three-layer approach:

### 1. Lint Rule PGSM003

Before any migration runs, the linter checks for `CREATE INDEX` without `CONCURRENTLY`:

```
PGSM003 [ERROR] CREATE INDEX without CONCURRENTLY
  → migrations/0005_add-status-index.up.sql:1
  Fix: Use CREATE INDEX CONCURRENTLY IF NOT EXISTS ...
```

This catches the problem at development time, not in production.

### 2. Lint Rule PGSM005

The linter also catches `ALTER TYPE ... ADD VALUE` inside a transaction — another statement that PostgreSQL doesn't allow in transactions:

```
PGSM005 [ERROR] ALTER TYPE ... ADD VALUE inside a transaction
  → Fix: Add '-- pgsm-transaction: never' to the migration
```

### 3. Transaction Policy

Three modes, set per migration:

| Directive | Behavior |
|-----------|----------|
| `-- pgsm-transaction: auto` | Wrap in transaction (default) |
| `-- pgsm-transaction: always` | Always use a transaction (explicit) |
| `-- pgsm-transaction: never` | Skip BEGIN/COMMIT |

The `auto` → `never` escalation is the key insight: safe by default, with an explicit opt-out when you need it.

### 4. Override System

If you intentionally want to create a small index without `CONCURRENTLY` (e.g., on a table with <1000 rows), you can override the lint rule:

```sql
-- pgsm:allow PGSM003 reason="Table has <1000 rows, lock duration negligible"
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings (key);
```

The reason is recorded in the migration history — so when someone reviews it later, they understand *why* the override exists.

## The Complete Safe Pattern

Here's the full pattern for adding an index to a production table:

```sql
-- migrations/0015_add-orders-status-index.up.sql
-- pgsm-transaction: never
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders (status);
```

```sql
-- migrations/0015_add-orders-status-index.down.sql
DROP INDEX IF EXISTS idx_orders_status;
```

Key elements:
1. **`CONCURRENTLY`** — no table lock
2. **`IF NOT EXISTS`** — idempotent (caught by PGSM004 if missing)
3. **`-- pgsm-transaction: never`** — no wrapping transaction
4. **Down migration** — always provide a rollback

## Beyond Indexes: Other Non-Transactional DDL

`CONCURRENTLY` isn't the only DDL that breaks transactions. PostgreSQL also prohibits:

| Statement | Transaction? | Why |
|-----------|:---:|-----|
| `CREATE INDEX CONCURRENTLY` | ❌ | Multi-transaction build |
| `DROP INDEX CONCURRENTLY` | ❌ | Same reason |
| `ALTER TYPE ... ADD VALUE` | ❌ | Enum values are non-transactional |
| `VACUUM` | ❌ | Cannot run in transaction |
| `CLUSTER` | ❌ | Rewrites table |

All of these need `-- pgsm-transaction: never`.

## Takeaways

1. **Always use `CONCURRENTLY`** for indexes on production tables
2. **Always use `IF NOT EXISTS`** — make migrations idempotent
3. **Use per-migration transaction control** — not global on/off
4. **Lint your migrations** — catch problems before production
5. **Record overrides** — document why you deviated from the safe path

---

*pg-safe-migrate is an open-source migration engine for Node.js that handles all of this automatically. [Check it out on GitHub.](https://github.com/defnotwig/pg-safe-migrate)*

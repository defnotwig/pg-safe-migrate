# Zero-Downtime Migration Patterns

This guide covers patterns for making schema changes without application downtime.

## The Expand/Contract Pattern

The core pattern for zero-downtime migrations:

1. **Expand**: Add new schema alongside old (backward compatible)
2. **Migrate**: Update application code to use new schema
3. **Contract**: Remove old schema (forward migration only)

Each step is a separate migration, potentially deployed at different times.

## Adding a Column

### ✗ Risky (blocks reads/writes)

```sql
ALTER TABLE users ADD COLUMN phone TEXT NOT NULL;
```

### ✓ Safe

**Step 1: Add nullable column**

```sql
ALTER TABLE users ADD COLUMN phone TEXT;
```

**Step 2: Backfill data** (application-level or batch migration)

```sql
UPDATE users SET phone = '' WHERE phone IS NULL;
```

**Step 3: Add NOT NULL constraint**

```sql
ALTER TABLE users ADD CONSTRAINT users_phone_not_null
  CHECK (phone IS NOT NULL) NOT VALID;

ALTER TABLE users VALIDATE CONSTRAINT users_phone_not_null;
```

## Renaming a Column

### ✗ Risky

```sql
ALTER TABLE users RENAME COLUMN name TO full_name;
```

### ✓ Safe

**Step 1: Add new column**

```sql
ALTER TABLE users ADD COLUMN full_name TEXT;
```

**Step 2: Backfill**

```sql
UPDATE users SET full_name = name WHERE full_name IS NULL;
```

**Step 3: Update application** to read/write both columns

**Step 4: Drop old column** (after all code is deployed)

```sql
-- pgsm:allow-next PGSM002 reason="Column replaced by full_name" ticket="PROJ-123"
ALTER TABLE users DROP COLUMN name;
```

## Creating an Index

### ✗ Risky (locks writes)

```sql
CREATE INDEX idx_users_email ON users(email);
```

### ✓ Safe

```sql
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

**Note**: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. pg-safe-migrate's `auto` transaction policy handles this automatically.

## Adding a Foreign Key

### ✗ Risky (locks both tables)

```sql
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id) REFERENCES users(id);
```

### ✓ Safe (two steps)

**Step 1: Add constraint without validation**

```sql
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;
```

**Step 2: Validate (non-blocking)**

```sql
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_user;
```

## Dropping a Table

### ✗ Risky

```sql
DROP TABLE users;
```

### ✓ Safe

1. Stop all application code from querying the table
2. Verify via logs/monitoring that no queries hit the table
3. Drop with an explicit override:

```sql
-- pgsm:allow-next PGSM001 reason="Table unused since 2024-01-15" ticket="PROJ-456"
DROP TABLE users;
```

## Changing Column Types

### ✗ Risky (rewrites table)

```sql
ALTER TABLE users ALTER COLUMN age TYPE BIGINT;
```

### ✓ Safe

1. Add a new column with the desired type
2. Backfill data
3. Update application to use new column
4. Drop old column

## Tips

- **Deploy migrations separately from code** — apply the "expand" migration first, then deploy new code
- **Use `pg-safe-migrate check`** in CI to catch risky patterns before merge
- **Test migrations on a copy** of production data before applying
- **Monitor lock waits** with `SET lock_timeout = '5s'` to fail fast instead of deadlocking

## Further Reading

- [Safety Rules](./safety-rules.md) — rules that enforce these patterns automatically
- [Getting Started](./getting-started.md) — quick start guide for new users
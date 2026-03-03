# Safety Rules

pg-safe-migrate ships with 10 built-in safety rules that catch common migration anti-patterns. All rules are enabled by default.

## Rules Reference

### PGSM001 — Drop Table

**Severity**: Error

Dropping a table permanently deletes all data. Use the [expand/contract pattern](./zero-downtime.md) instead.

```sql
-- ✗ Blocked
DROP TABLE users;

-- ✓ Safe alternative: deprecate in code first, then drop in a later migration
```

### PGSM002 — Drop Column

**Severity**: Error

Dropping a column permanently removes data and may break applications still querying it.

```sql
-- ✗ Blocked
ALTER TABLE users DROP COLUMN legacy_field;

-- ✓ Safe: stop reading the column in code first, then drop it later
```

### PGSM003 — Add NOT NULL Column Without Default

**Severity**: Error

Adding a `NOT NULL` column without a `DEFAULT` requires a full table scan and will fail if rows exist.

```sql
-- ✗ Blocked
ALTER TABLE users ADD COLUMN name TEXT NOT NULL;

-- ✓ Safe
ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
```

### PGSM004 — Rename Table

**Severity**: Error

Renaming a table breaks all queries referencing the old name.

```sql
-- ✗ Blocked
ALTER TABLE users RENAME TO people;

-- ✓ Safe: create a view with the old name, or use expand/contract
```

### PGSM005 — Rename Column

**Severity**: Error

Renaming a column breaks queries referencing the old name.

```sql
-- ✗ Blocked
ALTER TABLE users RENAME COLUMN name TO full_name;

-- ✓ Safe: add new column, backfill, update code, drop old column
```

### PGSM006 — Change Column Type

**Severity**: Warning

Changing a column type may require a full table rewrite and lock.

```sql
-- ⚠ Warning
ALTER TABLE users ALTER COLUMN age TYPE BIGINT;

-- ✓ Safe: add new column with desired type, backfill, swap
```

### PGSM007 — CREATE INDEX Without CONCURRENTLY

**Severity**: Error

`CREATE INDEX` without `CONCURRENTLY` locks the table for writes.

```sql
-- ✗ Blocked
CREATE INDEX idx_email ON users(email);

-- ✓ Safe
CREATE INDEX CONCURRENTLY idx_email ON users(email);
```

### PGSM008 — DROP INDEX Without CONCURRENTLY

**Severity**: Error

`DROP INDEX` without `CONCURRENTLY` locks the table.

```sql
-- ✗ Blocked
DROP INDEX idx_email;

-- ✓ Safe
DROP INDEX CONCURRENTLY idx_email;
```

### PGSM009 — Foreign Key Without NOT VALID

**Severity**: Warning

Adding a foreign key constraint validates all rows, locking both tables.

```sql
-- ⚠ Warning
ALTER TABLE orders ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users(id);

-- ✓ Safe: two-step approach
ALTER TABLE orders ADD CONSTRAINT fk_user
  FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;

ALTER TABLE orders VALIDATE CONSTRAINT fk_user;
```

### PGSM010 — CHECK Constraint Without NOT VALID

**Severity**: Warning

Adding a `CHECK` constraint validates all rows, locking the table.

```sql
-- ⚠ Warning
ALTER TABLE users ADD CONSTRAINT chk_age CHECK (age > 0);

-- ✓ Safe: two-step approach
ALTER TABLE users ADD CONSTRAINT chk_age CHECK (age > 0) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT chk_age;
```

## Severity Levels

| Level     | Meaning                                       | Exit Code |
| --------- | --------------------------------------------- | --------- |
| `error`   | Must be fixed or explicitly overridden        | 1         |
| `warning` | Should be reviewed; does not block by default | 0         |
| `info`    | Informational; does not block                 | 0         |

## Machine-Readable Output

```bash
pg-safe-migrate lint --format json
```

```json
[
  {
    "ruleId": "PGSM007",
    "severity": "error",
    "message": "CREATE INDEX without CONCURRENTLY will lock the table for writes.",
    "file": "migrations/001_add_index.sql",
    "statementIndex": 0,
    "snippet": "CREATE INDEX idx_name ON users(name);"
  }
]
```

## See Also

- [Overrides](./overrides.md) — how to allow specific rules when needed
- [Configuration](./configuration.md) — global rule configuration options
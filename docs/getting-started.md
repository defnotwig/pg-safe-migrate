# Getting Started

## Installation

```bash
# Global install (recommended for CLI)
npm install -g pg-safe-migrate

# Or as a dev dependency
npm install -D pg-safe-migrate

# Or use the core library programmatically
npm install pg-safe-migrate-core
```

## Initialize

```bash
pg-safe-migrate init
```

This creates:

- `./migrations/` — directory for your SQL migration files
- `pgsm.config.json` — configuration file

## Create Your First Migration

```bash
pg-safe-migrate create add_users_table --with-down
```

This generates timestamped files:

```
migrations/
  20240315_143022_add_users_table.sql
  20240315_143022_add_users_table.down.sql
```

Edit the up migration:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

And the down migration:

```sql
DROP TABLE users;
```

## Apply Migrations

```bash
export DATABASE_URL=postgresql://localhost:5432/mydb

pg-safe-migrate up
```

## Check Status

```bash
pg-safe-migrate status
```

Output:

```
Migration Status
────────────────

Applied (1):
  ✓ 20240315_143022_add_users_table  2024-03-15T14:30:22  42ms

Pending (0):
ℹ No pending migrations.
```

## Lint for Safety

```bash
pg-safe-migrate lint
```

The linter checks for risky operations like:

- Dropping tables or columns
- Creating indexes without `CONCURRENTLY`
- Adding `NOT NULL` columns without defaults

## CI Gate

```bash
pg-safe-migrate check
```

Exits non-zero if drift, unsafe migrations, or lint errors are detected. Perfect for CI pipelines.

## Next Steps

- [Configuration](./configuration.md) — customize table names, schemas, and policies
- [Safety Rules](./safety-rules.md) — learn about built-in rules and how to override them
- [GitHub Action](./github-action.md) — integrate into your CI workflow
- [Zero-Downtime Deployments](./zero-downtime.md) — learn safe migration patterns for production

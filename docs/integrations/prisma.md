# Using pg-safe-migrate with Prisma

> Use Prisma for your client & queries. Use pg-safe-migrate for safe schema migrations.

Prisma Migrate is convenient but lacks safety analysis. pg-safe-migrate gives you
advisory locks, drift detection, and 10 built-in safety rules — while Prisma
handles your type-safe client.

## Install

```bash
npm install -D pg-safe-migrate
npm install prisma @prisma/client
```

## Setup

```bash
# Initialize pg-safe-migrate
npx pg-safe-migrate init

# Your migrations live alongside Prisma (not inside prisma/migrations/)
mkdir -p migrations
```

Edit `pgsm.config.json`:

```json
{
  "migrationsDir": "./migrations",
  "databaseUrl": "${DATABASE_URL}"
}
```

## Workflow

1. **Write migrations manually** (not `prisma migrate dev`):

```bash
npx pg-safe-migrate create add-users-table
```

2. **Edit the generated SQL** — write your DDL:

```sql
-- migrations/0001_add-users-table.up.sql
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

3. **Lint before applying**:

```bash
npx pg-safe-migrate lint
```

4. **Apply migrations**:

```bash
npx pg-safe-migrate up
```

5. **Pull the schema into Prisma** (keeps your Prisma client in sync):

```bash
npx prisma db pull
npx prisma generate
```

## CI Gate

```yaml
# .github/workflows/ci.yml
jobs:
  migration-check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: defnotwig/pg-safe-migrate@v1
        with:
          command: check
          database-url: postgresql://postgres:postgres@localhost:5432/postgres
```

## Common Footguns

### Drift from `prisma migrate dev`

Don't mix `prisma migrate dev` and `pg-safe-migrate up` on the same database.
Pick one migration runner. Use Prisma for client generation only:

```bash
# ✅ Safe workflow
npx pg-safe-migrate up          # apply schema changes
npx prisma db pull              # sync Prisma schema
npx prisma generate             # regenerate client

# ❌ Avoid
npx prisma migrate dev          # don't use Prisma's migrations
```

### Lock timeouts

If Prisma has open connections holding locks, migrations may hang.
Set a statement timeout in your migration:

```sql
SET lock_timeout = '5s';
ALTER TABLE users ADD COLUMN bio TEXT;
```

### CONCURRENTLY indexes

Use `-- pgsm-transaction: never` for concurrent index creation:

```sql
-- pgsm-transaction: never
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

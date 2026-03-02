# Using pg-safe-migrate with Knex / TypeORM

> Replace the migration runner but keep your query builder.

Both Knex and TypeORM include migration runners, but they lack safety
analysis. pg-safe-migrate gives you advisory locks, drift detection, and
10 built-in safety rules — while you keep using Knex or TypeORM for queries.

---

## Knex

### Install

```bash
npm install -D pg-safe-migrate
npm install knex pg
```

### Setup

```bash
npx pg-safe-migrate init
```

```json
{
  "migrationsDir": "./migrations",
  "databaseUrl": "${DATABASE_URL}"
}
```

### Workflow

```bash
# Create migration (plain SQL, not Knex JS files)
npx pg-safe-migrate create add-users-table

# Lint → apply
npx pg-safe-migrate lint
npx pg-safe-migrate up
```

### Knex config (queries only)

```typescript
// knexfile.ts
import type { Knex } from 'knex';

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  // Do NOT configure migrations here — pg-safe-migrate handles them
};

export default config;
```

### Migration scripts

```json
{
  "scripts": {
    "migrate:up": "pg-safe-migrate up",
    "migrate:down": "pg-safe-migrate down",
    "migrate:status": "pg-safe-migrate status",
    "migrate:lint": "pg-safe-migrate lint",
    "migrate:create": "pg-safe-migrate create"
  }
}
```

---

## TypeORM

### Install

```bash
npm install -D pg-safe-migrate
npm install typeorm pg reflect-metadata
```

### Setup

```bash
npx pg-safe-migrate init
```

### Disable TypeORM migrations

```typescript
// data-source.ts
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/entities/**/*.ts'],
  // ❌ Don't use TypeORM migrations
  // migrations: ['src/migrations/**/*.ts'],
  // migrationsRun: false,
  synchronize: false,  // NEVER use synchronize in production
});
```

### Workflow

```bash
# Create migration
npx pg-safe-migrate create add-users-table

# Write SQL manually (not TypeORM's query builder)
# migrations/0001_add-users-table.up.sql

# Lint, apply
npx pg-safe-migrate lint
npx pg-safe-migrate up
```

---

## CI Gate (both)

```yaml
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

### Don't mix migration runners

Pick one tool for applying migrations. If you run both `knex migrate:latest`
and `pg-safe-migrate up`, you'll get state drift:

```bash
# ✅ Use pg-safe-migrate exclusively
npx pg-safe-migrate up

# ❌ Two migration histories = confusion
npx knex migrate:latest
npx pg-safe-migrate up
```

### TypeORM `synchronize: true`

Never use this in production. It makes schema changes without migrations:

```typescript
// ❌ DANGEROUS
synchronize: true

// ✅ Always false — use pg-safe-migrate
synchronize: false
```

### Lock contention

If your ORM holds long transactions, DDL may hang. Set timeouts:

```sql
SET lock_timeout = '5s';
ALTER TABLE users ADD COLUMN bio TEXT;
```

### CONCURRENTLY indexes

Neither Knex nor TypeORM supports `CONCURRENTLY`. Write it by hand:

```sql
-- pgsm-transaction: never
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

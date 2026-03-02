# Using pg-safe-migrate with Drizzle ORM

> Use Drizzle for type-safe queries. Use pg-safe-migrate for safe schema migrations.

Drizzle Kit generates migrations but doesn't lint them for safety. pg-safe-migrate
adds advisory locks, drift detection, and 10 safety rules on top of hand-written
SQL migrations — while Drizzle handles your type-safe query builder.

## Install

```bash
npm install -D pg-safe-migrate
npm install drizzle-orm drizzle-kit pg
```

## Setup

```bash
npx pg-safe-migrate init
```

Edit `pgsm.config.json`:

```json
{
  "migrationsDir": "./migrations",
  "databaseUrl": "${DATABASE_URL}"
}
```

## Workflow

### Option A: Write migrations by hand (recommended)

```bash
# Create migration
npx pg-safe-migrate create add-users-table

# Edit the SQL, lint, apply
npx pg-safe-migrate lint
npx pg-safe-migrate up
```

Then update your Drizzle schema file to match:

```typescript
// src/db/schema.ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Option B: Generate with Drizzle Kit, lint with pg-safe-migrate

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Copy the output into pg-safe-migrate's directory
cp drizzle/0001_*.sql migrations/0001_add-users-table.up.sql

# Lint for safety
npx pg-safe-migrate lint

# Apply with advisory locks + checksums
npx pg-safe-migrate up
```

## Minimal Config

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  // Don't use drizzle-kit migrate — use pg-safe-migrate instead
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## CI Gate

```yaml
- uses: defnotwig/pg-safe-migrate@v1
  with:
    command: check
    database-url: ${{ secrets.DATABASE_URL }}
```

## Common Footguns

### Don't use `drizzle-kit migrate` in production

Drizzle Kit's `migrate` command doesn't use advisory locks or checksums.
Use pg-safe-migrate for applying migrations:

```bash
# ✅ Safe
npx pg-safe-migrate up

# ❌ No lock protection
npx drizzle-kit migrate
```

### CONCURRENTLY indexes

Drizzle Kit can't generate `CONCURRENTLY` indexes. Write these by hand:

```sql
-- pgsm-transaction: never
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

### Lock timeouts

If your app has long-running Drizzle queries, they may block DDL.
Add timeouts:

```sql
SET lock_timeout = '5s';
ALTER TABLE users ADD COLUMN bio TEXT;
```

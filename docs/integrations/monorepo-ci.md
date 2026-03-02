# pg-safe-migrate in a Monorepo + CI

> Examples for pnpm workspaces, Turborepo, and multi-service architectures.

## Project Structure

```
my-monorepo/
├── packages/
│   ├── api/              # Express/Fastify service
│   ├── web/              # Next.js frontend
│   └── db/               # Shared database package
│       ├── migrations/
│       │   ├── 0001_create-users.up.sql
│       │   ├── 0001_create-users.down.sql
│       │   ├── 0002_add-posts.up.sql
│       │   └── 0002_add-posts.down.sql
│       ├── pgsm.config.json
│       └── package.json
├── pnpm-workspace.yaml
└── package.json
```

## Setup

### 1. Shared `db` package

```bash
cd packages/db
npm init -y
npm install -D pg-safe-migrate
npx pg-safe-migrate init
```

```json
// packages/db/package.json
{
  "name": "@myapp/db",
  "private": true,
  "scripts": {
    "migrate:up": "pg-safe-migrate up",
    "migrate:down": "pg-safe-migrate down",
    "migrate:status": "pg-safe-migrate status",
    "migrate:lint": "pg-safe-migrate lint",
    "migrate:check": "pg-safe-migrate check",
    "migrate:create": "pg-safe-migrate create"
  },
  "devDependencies": {
    "pg-safe-migrate": "^0.1.0"
  }
}
```

```json
// packages/db/pgsm.config.json
{
  "migrationsDir": "./migrations",
  "databaseUrl": "${DATABASE_URL}"
}
```

### 2. pnpm workspace

```yaml
# pnpm-workspace.yaml
packages:
  - packages/*
```

### 3. Root scripts

```json
// package.json (root)
{
  "scripts": {
    "db:up": "pnpm --filter @myapp/db migrate:up",
    "db:down": "pnpm --filter @myapp/db migrate:down",
    "db:status": "pnpm --filter @myapp/db migrate:status",
    "db:lint": "pnpm --filter @myapp/db migrate:lint",
    "db:check": "pnpm --filter @myapp/db migrate:check",
    "db:create": "pnpm --filter @myapp/db migrate:create"
  }
}
```

## CI: GitHub Actions

### Lint migrations on every PR

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    paths:
      - 'packages/db/migrations/**'

jobs:
  migration-lint:
    name: Lint Migrations
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:lint
```

### Full check against a real database

```yaml
  migration-check:
    name: Migration Check
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: ['5432:5432']

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      - name: Apply migrations
        run: pnpm db:up
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb

      - name: Run check
        run: pnpm db:check
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
```

### Using the GitHub Action directly

```yaml
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
          migrations-dir: packages/db/migrations
```

## Turborepo

Add migration tasks to `turbo.json`:

```json
{
  "tasks": {
    "db:lint": {
      "cache": false
    },
    "db:check": {
      "cache": false,
      "env": ["DATABASE_URL"]
    },
    "db:up": {
      "cache": false,
      "env": ["DATABASE_URL"]
    }
  }
}
```

```bash
# Run from root
turbo run db:lint
turbo run db:check
```

## Multi-Service Architecture

If different services own different schemas:

```
packages/
├── user-service/
│   └── migrations/        # Schema: user_service
├── billing-service/
│   └── migrations/        # Schema: billing
└── notification-service/
    └── migrations/        # Schema: notifications
```

Each service gets its own config:

```json
// packages/user-service/pgsm.config.json
{
  "migrationsDir": "./migrations",
  "databaseUrl": "${DATABASE_URL}",
  "historyTable": "user_service.pgsm_history"
}
```

```json
// packages/billing-service/pgsm.config.json
{
  "migrationsDir": "./migrations",
  "databaseUrl": "${DATABASE_URL}",
  "historyTable": "billing.pgsm_history"
}
```

CI runs checks for each service:

```yaml
- run: pnpm --filter @myapp/user-service migrate:check
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
- run: pnpm --filter @myapp/billing-service migrate:check
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Common Footguns

### Forgetting `--filter`

Without `--filter`, pnpm runs scripts in all packages:

```bash
# ❌ Runs in all packages (none have migrate:up except db)
pnpm migrate:up

# ✅ Target the db package
pnpm --filter @myapp/db migrate:up
```

### Lock contention in parallel CI

If multiple CI jobs run migrations against the same database,
advisory locks prevent corruption — but jobs may timeout waiting.
Use separate databases per CI job:

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_${{ github.run_id }}
```

### Drift between branches

Each PR branch may have different migrations. Run `pg-safe-migrate check`
against a fresh database (not a shared staging DB) to avoid phantom drift.

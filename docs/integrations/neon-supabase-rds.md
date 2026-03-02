# Using pg-safe-migrate with Neon, Supabase & AWS RDS

> Connection notes and safe defaults for managed PostgreSQL providers.

Managed Postgres services add connection constraints (poolers, SSL, timeouts)
that affect migration tooling. This guide covers the setup for each provider.

---

## Neon

### Connection String

Neon uses a WebSocket-based pooler. For migrations, use the **direct connection**
(not the pooled endpoint):

```bash
# ✅ Direct connection (for migrations)
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"

# ❌ Pooled connection (for app queries, not migrations)
# DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/dbname"
```

### Config

```json
{
  "migrationsDir": "./migrations",
  "databaseUrl": "${DATABASE_URL}",
  "historyTable": "public.pgsm_history"
}
```

### Neon branching

Neon branches are full Postgres copies. Run migrations on each branch:

```bash
# Main branch
DATABASE_URL="..." npx pg-safe-migrate up

# Preview branch
DATABASE_URL="..." npx pg-safe-migrate up
```

### CI with Neon

```yaml
- uses: defnotwig/pg-safe-migrate@v1
  with:
    command: check
    database-url: ${{ secrets.NEON_DATABASE_URL }}
```

---

## Supabase

### Connection String

Use the **direct connection** (port 5432), not the pooler (port 6543):

```bash
# ✅ Direct (for migrations)
DATABASE_URL="postgresql://postgres.[ref]:pass@aws-0-region.pooler.supabase.com:5432/postgres"

# ❌ Pooler — transaction mode breaks multi-statement migrations
# DATABASE_URL="postgresql://postgres.[ref]:pass@aws-0-region.pooler.supabase.com:6543/postgres"
```

### Why not the pooler?

Supabase's pgbouncer runs in **transaction mode** by default. This means:
- `SET` commands are lost between statements
- Advisory locks don't persist
- Multi-statement transactions may behave unexpectedly

pg-safe-migrate uses advisory locks and transactions — always use the direct connection.

### Config

```json
{
  "migrationsDir": "./supabase/migrations",
  "databaseUrl": "${DATABASE_URL}"
}
```

### Supabase CLI + pg-safe-migrate

You can use Supabase CLI for local dev and pg-safe-migrate for production:

```bash
# Local dev
supabase start
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres" npx pg-safe-migrate up

# Production
DATABASE_URL="..." npx pg-safe-migrate up
```

---

## AWS RDS

### Connection String

```bash
DATABASE_URL="postgresql://user:pass@mydb.xxxxx.us-east-1.rds.amazonaws.com:5432/mydb?sslmode=require"
```

### SSL Certificate

RDS requires SSL. If you get certificate errors:

```bash
# Download the RDS CA bundle
curl -o rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Set in environment
PGSSLROOTCERT=./rds-ca.pem DATABASE_URL="..." npx pg-safe-migrate up
```

Or in your connection string:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=verify-full&sslrootcert=./rds-ca.pem"
```

### IAM Authentication

For IAM-based auth, generate a token before running:

```bash
TOKEN=$(aws rds generate-db-auth-token --hostname mydb.xxxxx.rds.amazonaws.com --port 5432 --username iam_user)
DATABASE_URL="postgresql://iam_user:${TOKEN}@mydb.xxxxx.rds.amazonaws.com:5432/mydb?sslmode=require" npx pg-safe-migrate up
```

### RDS Proxy

RDS Proxy uses connection pooling. Like Supabase, use the **direct endpoint** for migrations:

```bash
# ✅ Direct RDS endpoint (for migrations)
DATABASE_URL="postgresql://user:pass@mydb.xxxxx.rds.amazonaws.com:5432/mydb"

# ❌ RDS Proxy (for app queries)
# DATABASE_URL="postgresql://user:pass@myproxy.proxy-xxxxx.rds.amazonaws.com:5432/mydb"
```

---

## Common Configuration (all providers)

### Lock timeout

Prevent migrations from waiting forever for locks:

```sql
-- Add to migration files that ALTER existing tables
SET lock_timeout = '10s';
```

### Statement timeout

Prevent runaway migrations:

```sql
SET statement_timeout = '60s';
```

### CONCURRENTLY indexes

Always use `CONCURRENTLY` for index creation on production tables:

```sql
-- pgsm-transaction: never
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

### CI Gate

```yaml
- uses: defnotwig/pg-safe-migrate@v1
  with:
    command: check
    database-url: ${{ secrets.DATABASE_URL }}
```

## Common Footguns

| Issue | Cause | Fix |
|-------|-------|-----|
| "advisory lock failed" | Using pooled connection | Switch to direct connection |
| "SSL required" | Missing `sslmode` param | Add `?sslmode=require` to URL |
| "statement timeout" | Large migration on big table | Set `statement_timeout` or run off-hours |
| "permission denied" | Limited DB user | Use superuser or grant `CREATE` on schema |
| "connection refused" | IP not allowed | Add CI runner IP to security group / allow-list |

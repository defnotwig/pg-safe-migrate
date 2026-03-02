# pg-safe-migrate v0.1.0

**Initial release** — a safety-first PostgreSQL migration engine for Node.js.

## Highlights

- **10 built-in safety rules** (PGSM001–PGSM010) that catch common production incidents before they happen
- **SHA-256 checksum drift detection** — know immediately when applied migrations have been modified
- **PostgreSQL advisory locks** — prevent concurrent migration runs from corrupting state
- **Transaction policy** — `auto` (default), `always`, or `never` per migration
- **Override system with required reasons** — explicitly acknowledge risks, tracked in history
- **Full CLI** with 8 commands: `init`, `create`, `up`, `down`, `status`, `lint`, `check`, `doctor`
- **GitHub Action** — add a CI gate in one line: `uses: defnotwig/pg-safe-migrate@v1`
- **Dual format** — ESM + CJS builds with full TypeScript declarations

## Safety Rules

| Rule | What it catches |
|------|----------------|
| PGSM001 | `DROP TABLE` / `DROP COLUMN` — destructive operations |
| PGSM002 | `ALTER TABLE ... ADD COLUMN ... DEFAULT` — full table rewrite (PG < 11) |
| PGSM003 | `CREATE INDEX` without `CONCURRENTLY` — table locks |
| PGSM004 | Missing `IF NOT EXISTS` / `IF EXISTS` — non-idempotent DDL |
| PGSM005 | `ALTER TYPE ... ADD VALUE` inside a transaction — PG limitation |
| PGSM006 | Raw data manipulation in schema migrations |
| PGSM007 | `SET NOT NULL` without a check constraint — full table scan |
| PGSM008 | Multiple DDL statements in one migration — harder rollback |
| PGSM009 | Renaming tables or columns without aliases — breaks dependents |
| PGSM010 | Missing `WHERE` clause in `UPDATE`/`DELETE` — full-table modification |

## Packages

| Package | npm |
|---------|-----|
| `pg-safe-migrate` (CLI) | [![npm](https://img.shields.io/npm/v/pg-safe-migrate)](https://www.npmjs.com/package/pg-safe-migrate) |
| `pg-safe-migrate-core` | [![npm](https://img.shields.io/npm/v/pg-safe-migrate-core)](https://www.npmjs.com/package/pg-safe-migrate-core) |

## Quick Start

```bash
# Install
npm install -D pg-safe-migrate

# Initialize config
npx pg-safe-migrate init

# Create your first migration
npx pg-safe-migrate create add-users-table

# Check for safety issues
npx pg-safe-migrate lint

# Apply migrations
DATABASE_URL=postgresql://... npx pg-safe-migrate up
```

## CI Gate (GitHub Action)

```yaml
- uses: defnotwig/pg-safe-migrate@v1
  with:
    command: check
    database-url: ${{ secrets.DATABASE_URL }}
```

## What's Next

See the [Roadmap](ROADMAP.md) for planned improvements including:
- More safety rules (v0.2)
- Serverless adapters and ORM integrations (v0.3)
- Migration groups and squash (v0.4)
- Stable v1.0 with compatibility guarantees

## Links

- [Documentation](docs/)
- [Examples](examples/)
- [Contributing](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

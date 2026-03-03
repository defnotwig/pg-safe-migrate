# Configuration

pg-safe-migrate can be configured via:

1. **CLI flags** (highest priority)
2. **Config file** (`pgsm.config.json` or `.pgsmrc.json`)
3. **Environment variables**
4. **Defaults** (lowest priority)

## Config File

Create `pgsm.config.json` in your project root:

```json
{
  "databaseUrl": "${DATABASE_URL}",
  "migrationsDir": "./migrations",
  "schema": "public",
  "tableName": "_pg_safe_migrate",
  "transactionPolicy": "auto",
  "requireDown": false,
  "allowRules": [],
  "statementTimeout": "30s",
  "lockTimeout": "10s"
}
```

## Options Reference

| Option              | CLI Flag         | Env Var               | Default            | Description                  |
| ------------------- | ---------------- | --------------------- | ------------------ | ---------------------------- |
| `databaseUrl`       | `-d, --database` | `DATABASE_URL`        | —                  | PostgreSQL connection string |
| `migrationsDir`     | `--dir`          | `PGSM_MIGRATIONS_DIR` | `./migrations`     | Path to migration files      |
| `schema`            | `--schema`       | —                     | `public`           | Schema for the history table |
| `tableName`         | `--table`        | —                     | `_pg_safe_migrate` | History table name           |
| `transactionPolicy` | `--transaction`  | —                     | `auto`             | Transaction wrapping policy  |
| `lockId`            | `--lock-id`      | —                     | _(derived)_        | Advisory lock ID             |
| `requireDown`       | `--require-down` | —                     | `false`            | Require down migrations      |
| `allowRules`        | `--allow-unsafe` | —                     | `[]`               | Globally allowed lint rules  |
| `statementTimeout`  | —                | —                     | _(none)_           | SQL `statement_timeout`      |
| `lockTimeout`       | —                | —                     | _(none)_           | SQL `lock_timeout`           |

## Transaction Policy

| Policy   | Behavior                                                                               |
| -------- | -------------------------------------------------------------------------------------- |
| `auto`   | Auto-detect: use transactions unless migration contains `CONCURRENTLY`, `VACUUM`, etc. |
| `always` | Always wrap in transaction. Fails if non-transactional statements detected.            |
| `never`  | Never wrap in transaction. Statements execute sequentially.                            |

**Recommendation**: Use `auto` (default). It handles most cases correctly.

## History Table

The history table stores applied migration records:

| Column         | Type               | Description                         |
| -------------- | ------------------ | ----------------------------------- |
| `id`           | `TEXT PRIMARY KEY` | Migration filename (sans extension) |
| `checksum`     | `TEXT NOT NULL`    | SHA-256 of file content             |
| `applied_at`   | `TIMESTAMPTZ`      | When it was applied                 |
| `execution_ms` | `INTEGER`          | How long it took                    |
| `direction`    | `TEXT`             | `up` (or `down` for rollbacks)      |
| `tool_version` | `TEXT`             | Version of pg-safe-migrate used     |
| `notes`        | `JSONB NULL`       | Optional metadata                   |

## Programmatic Usage

```typescript
import { createMigrator } from "pg-safe-migrate-core";

const migrator = createMigrator({
  databaseUrl: process.env.DATABASE_URL,
  migrationsDir: "./migrations",
});

// Check for issues
const { ok, issues, drift } = await migrator.check();

// Apply pending
const steps = await migrator.run();

// Get status
const status = await migrator.status();
```

## Tips

- Use environment variable interpolation (`${DATABASE_URL}`) in config files to avoid hardcoding credentials.
- Set `requireDown: true` in team environments to enforce reversible migrations.
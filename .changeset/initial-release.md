---
"pg-safe-migrate-core": minor
"pg-safe-migrate": minor
---

Initial release of pg-safe-migrate — a safety-first PostgreSQL migration engine for Node.js.

### Core Library (`pg-safe-migrate-core`)
- Migration engine with `createMigrator()` factory
- 10 built-in safety rules (PGSM001–PGSM010)
- SHA-256 checksum-based drift detection
- PostgreSQL advisory lock for single-runner guarantee
- Transaction policy: `auto` | `always` | `never`
- Smart `CONCURRENTLY` statement detection
- Override system with required reasons (`-- pgsm:allow` / `-- pgsm:allow-next`)
- `doctor()` command for environment health checks
- Pure `lintSql()` function for custom integrations
- Full TypeScript types and dual ESM/CJS output

### CLI (`pg-safe-migrate`)
- 8 commands: `init`, `create`, `up`, `down`, `status`, `lint`, `check`, `doctor`
- Config resolution: CLI flags > config file > env vars > defaults
- `${DATABASE_URL}` template expansion in config files
- CI-friendly output with `NO_COLOR` support

### GitHub Action
- Composite action wrapping the CLI
- Configurable command, database URL, and migration directory

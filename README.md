# pg-safe-migrate

[![npm version](https://img.shields.io/npm/v/pg-safe-migrate.svg)](https://www.npmjs.com/package/pg-safe-migrate)
[![npm downloads](https://img.shields.io/npm/dm/pg-safe-migrate.svg)](https://www.npmjs.com/package/pg-safe-migrate)
[![CI](https://github.com/defnotwig/pg-safe-migrate/actions/workflows/ci.yml/badge.svg)](https://github.com/defnotwig/pg-safe-migrate/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Safety-first PostgreSQL migration engine for Node.js**

pg-safe-migrate helps teams ship schema changes confidently by enforcing safety rules, detecting drift, and providing clear guardrails — all from a simple CLI or programmatic API.

## Features

- **Safety linter** — 10 built-in rules block risky schema operations by default
- **Drift detection** — SHA-256 checksums ensure applied migrations are immutable
- **Advisory locks** — Guarantees single-runner execution via PostgreSQL advisory locks
- **Transaction policy** — `auto` | `always` | `never` with smart detection of `CONCURRENTLY` statements
- **Override system** — Explicit, auditable overrides via SQL comments with required reasons
- **CI-ready** — `check` command as a CI gate, plus a GitHub Action wrapper
- **Programmatic API** — Use the core library directly in your application

## Quick Start

```bash
# Install
npm install -g pg-safe-migrate

# Initialize in your project
pg-safe-migrate init

# Create a migration
pg-safe-migrate create add_users_table

# Edit the generated file in ./migrations/
# Then apply:
export DATABASE_URL=postgresql://localhost/mydb
pg-safe-migrate up

# Check status
pg-safe-migrate status
```

## Packages

| Package | Description |
|---------|-------------|
| [`pg-safe-migrate`](./packages/cli) | CLI tool |
| [`pg-safe-migrate-core`](./packages/core) | Core library (programmatic API) |

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Configuration](./docs/configuration.md)
- [Safety Rules](./docs/safety-rules.md)
- [Overrides](./docs/overrides.md)
- [Zero-Downtime Patterns](./docs/zero-downtime.md)
- [GitHub Action](./docs/github-action.md)

## CI Gate Example

Add a safety check to your GitHub Actions workflow:

```yaml
- uses: defnotwig/pg-safe-migrate/action@v1
  with:
    command: check
    database_url: ${{ secrets.DATABASE_URL }}
```

Or run it manually:

```bash
pg-safe-migrate check --database $DATABASE_URL
```

Returns exit code 1 if any safety rules are violated or drift is detected.

## Why pg-safe-migrate?

| Feature | pg-safe-migrate | node-pg-migrate | graphile-migrate | dbmate |
|---------|:-:|:-:|:-:|:-:|
| Built-in safety linter | ✅ 10 rules | ❌ | ❌ | ❌ |
| Drift detection | ✅ SHA-256 | ❌ | ⚠️ hash-based | ❌ |
| Advisory locks | ✅ | ❌ | ✅ | ❌ |
| CONCURRENTLY detection | ✅ auto | Manual | ❌ | ❌ |
| Override system | ✅ auditable | N/A | N/A | N/A |
| CI gate command | ✅ `check` | ❌ | ❌ | ❌ |
| GitHub Action | ✅ | ❌ | ❌ | ❌ |
| Down migrations | ✅ optional | ✅ | ❌ | ✅ |
| TypeScript | ✅ native | ✅ | ✅ | Go |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT

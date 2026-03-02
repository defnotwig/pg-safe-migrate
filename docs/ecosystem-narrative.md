# Ecosystem Impact Track — Application Narrative

> For the Anthropic Claude for Open Source Program (Section 2.2)

## Project

**pg-safe-migrate** — A safety-first PostgreSQL migration engine for Node.js  
- GitHub: [github.com/defnotwig/pg-safe-migrate](https://github.com/defnotwig/pg-safe-migrate)  
- npm: [pg-safe-migrate](https://www.npmjs.com/package/pg-safe-migrate) | [pg-safe-migrate-core](https://www.npmjs.com/package/pg-safe-migrate-core)

## The Gap in the Node.js + PostgreSQL Ecosystem

PostgreSQL is the most popular database for Node.js applications (per the 2024 State of JS survey), yet the Node.js ecosystem lacks a migration tool with safety primitives that production PostgreSQL deployments demand:

- **Advisory locks** to prevent concurrent migration runs in distributed deployments (Kubernetes pods, CI runners)
- **Checksum-based drift detection** to catch unauthorized schema changes between environments
- **Safe-defaults linting** that catches destructive patterns *before* they reach production — like `DROP TABLE` without explicit override, `ALTER TABLE ... ADD COLUMN ... DEFAULT` on large tables, or `CREATE INDEX` inside transactions (which deadlocks on PostgreSQL)

Existing tools (Knex migrations, TypeORM migrations, node-pg-migrate, graphile-migrate) each address some subset, but none provide all three as first-class, zero-config defaults. This forces teams to build custom safety wrappers — or, more commonly, ship unsafe migrations that cause production outages.

## What pg-safe-migrate Provides

| Capability | Detail |
|---|---|
| **Advisory locks** | SHA-256-derived `pg_advisory_lock` IDs prevent concurrent runs across any number of instances |
| **Drift detection** | SHA-256 checksums for every applied migration; `check` command detects file tampering |
| **10 lint rules** | PGSM001–PGSM010 covering DROP TABLE, ALTER TYPE, raw TRUNCATE, missing transactions, `CONCURRENTLY` in transactions, lock timeouts, and more |
| **Transaction policy** | Auto-detects `CREATE INDEX CONCURRENTLY` and runs outside transactions; `always`/`never`/`auto` modes |
| **CLI + Library + GitHub Action** | `init`, `create`, `up`, `down`, `status`, `lint`, `check`, `doctor` — usable as CLI, programmatic API, or CI gate |
| **Override system** | `-- pgsm:allow PGSM001 reason="..." ticket="JIRA-123"` inline directives for intentional overrides with audit trail |

## Ecosystem Significance

1. **Infrastructure-level tooling**: Database migrations are foundational infrastructure — every web application with a database needs them. pg-safe-migrate targets the most common production stack (Node.js + PostgreSQL) with safety defaults that prevent the most common classes of migration-related outages.

2. **Fills a gap no other tool covers**: While Ruby has `strong_migrations` and Python has `django-migration-linter`, the Node.js ecosystem has no equivalent migration safety linter. pg-safe-migrate is the first Node.js tool to combine advisory locks + drift detection + safe-defaults linting in a single package.

3. **Framework-agnostic composability**: Designed to work alongside existing ORMs and query builders (Prisma, Drizzle, Knex, TypeORM) rather than replacing them. Teams keep their preferred stack while adding safety primitives. Integration guides are provided for all major ORMs.

4. **CI/CD-first design**: The GitHub Action (`defnotwig/pg-safe-migrate`) enables any project to add migration safety checks to their CI pipeline in minutes. The `check` command returns structured exit codes for drift, lint failures, and connectivity issues.

5. **Zero-dependency core**: The core library depends only on `pg` (node-postgres) — no ORM coupling, no framework lock-in, minimal supply chain surface.

## My Role

I am the sole creator and maintainer of pg-safe-migrate. I designed the architecture, wrote all source code (~4,000 lines of TypeScript), all 153 unit tests, the CLI, the GitHub Action, integration documentation for 5 ORMs/platforms, and the starter templates.

## Technical Quality Indicators

- **153 tests** (131 core + 22 CLI) with 100% of public API surface covered
- **Dual-format builds** (ESM + CommonJS + TypeScript declarations)
- **Strict TypeScript** with zero `any` types
- **Full CI pipeline** (GitHub Actions: lint, build, test on Node 18/20/22 × Ubuntu/macOS/Windows)
- **Changesets** for version management
- **Comprehensive documentation**: README, API docs, 5 integration guides, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT

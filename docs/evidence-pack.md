# pg-safe-migrate — Evidence Pack

> Prepared for: [Application / Submission Name]
> Date: [DATE]

---

## Project Overview

**pg-safe-migrate** is a safety-first PostgreSQL migration engine for Node.js.
It provides a CLI, core library, safety linter, drift detection, and GitHub Action.

- **Author:** [Your Name]
- **License:** MIT
- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js >= 18

## npm Packages

| Package | Link | Purpose |
|---------|------|---------|
| `pg-safe-migrate` | [npmjs.com/package/pg-safe-migrate](https://www.npmjs.com/package/pg-safe-migrate) | CLI with 8 commands |
| `pg-safe-migrate-core` | [npmjs.com/package/pg-safe-migrate-core](https://www.npmjs.com/package/pg-safe-migrate-core) | Core engine (embedded use) |

## GitHub Repository

- **Main repo:** [github.com/defnotwig/pg-safe-migrate](https://github.com/defnotwig/pg-safe-migrate)
- **Stars:** [X]
- **Topics:** postgresql, migrations, nodejs, ci, github-actions, zero-downtime

## GitHub Action

```yaml
- uses: defnotwig/pg-safe-migrate@v1
  with:
    command: check
    database-url: ${{ secrets.DATABASE_URL }}
```

- Action marketplace link: [github.com/marketplace/actions/pg-safe-migrate](https://github.com/marketplace/actions/pg-safe-migrate)

## Starter Templates

| Template | Link |
|----------|------|
| Express + Postgres | [github.com/defnotwig/express-postgres-starter](https://github.com/defnotwig/express-postgres-starter) |
| Next.js + Postgres | [github.com/defnotwig/nextjs-postgres-starter](https://github.com/defnotwig/nextjs-postgres-starter) |

## Downstream Adoption / Merged PRs

| Repository | PR | Status |
|------------|-----|--------|
| [repo-name] | [PR #X](link) | Merged / Open |
| [repo-name] | [PR #X](link) | Merged / Open |
| [repo-name] | [PR #X](link) | Merged / Open |

## Test Coverage

| Category | Count |
|----------|-------|
| Core unit tests | 131 |
| CLI unit tests | 22 |
| Integration tests | 16 |
| **Total** | **169** |

## CI Matrix

- **Node.js:** 18, 20, 22
- **PostgreSQL:** 14, 15, 16

## Key Technical Decisions

1. **10 built-in safety rules** (PGSM001–PGSM010) — catches destructive ops, missing CONCURRENTLY, non-idempotent DDL, transaction violations
2. **Advisory locks** — prevents concurrent migration runs
3. **SHA-256 checksums** — detects drift from modified migration files
4. **Per-migration transaction control** — auto/always/never
5. **Override system with reasons** — audit trail for accepted risks
6. **Dual format** — ESM + CJS + full TypeScript declarations

## Architecture

```
pg-safe-migrate (monorepo)
├── packages/core       # Engine: types, errors, checksum, lock, history,
│                       #   db, loader, lint (splitter + rules + sqlLint),
│                       #   planner, migrator
├── packages/cli        # Commander-based CLI with 8 commands
├── action.yml          # GitHub Action (composite)
├── starters/           # Template repositories
├── docs/               # Integration guides
└── content/            # Blog posts
```

## Release Cadence

- **v0.1.0** — Initial release (current)
- **v0.2.0** — Splitter improvements + more rules (planned)
- **v0.3.0** — Adapters + ORM integrations (planned)
- **v1.0.0** — Stable config + compatibility guarantees (planned)

See [ROADMAP.md](../ROADMAP.md) for full details.

## Content / Marketing

| Type | Title |
|------|-------|
| Launch post | "pg-safe-migrate: Advisory Locks + Drift Detection + Safe Defaults" |
| Deep dive | "Why CREATE INDEX CONCURRENTLY Breaks Transactions" |

## What This Demonstrates

1. **Full-stack open source delivery** — designed, built, tested, documented, published
2. **Production safety engineering** — deep PostgreSQL knowledge applied to tooling
3. **CI/CD pipeline design** — GitHub Actions with matrix testing
4. **Monorepo architecture** — pnpm workspaces + Changesets + linked versioning
5. **Ecosystem thinking** — CLI + library + Action + starters + integration docs
6. **Technical writing** — docs, blog posts, README with comparison tables

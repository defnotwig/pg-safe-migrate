# pg-safe-migrate GitHub Action

Run [pg-safe-migrate](https://github.com/defnotwig/pg-safe-migrate) commands in your CI pipeline for safety-first PostgreSQL migrations.

## Usage

```yaml
name: Migrations
on: [push, pull_request]

jobs:
  migrate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Check migrations
        uses: defnotwig/pg-safe-migrate/action@v1
        with:
          command: check
          database_url: postgresql://postgres:postgres@localhost:5432/postgres
          dir: ./migrations

      - name: Apply migrations
        uses: defnotwig/pg-safe-migrate/action@v1
        with:
          command: up
          database_url: postgresql://postgres:postgres@localhost:5432/postgres
          dir: ./migrations
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `command` | Command to run: `check`, `up`, `down`, `status`, `lint`, `doctor` | Yes | `check` |
| `database_url` | PostgreSQL connection string | Yes | — |
| `dir` | Path to migrations directory | No | `./migrations` |
| `schema` | Database schema for history table | No | `public` |
| `table` | History table name | No | `_pg_safe_migrate` |
| `transaction` | Transaction policy: `auto`, `always`, `never` | No | `auto` |
| `allow_unsafe` | Comma-separated safety rules to allow | No | — |
| `version` | Version of pg-safe-migrate to install | No | `latest` |

## Outputs

| Output | Description |
|--------|-------------|
| `result` | Exit code from pg-safe-migrate |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Drift, unsafe migrations, or lint errors |
| `2` | Configuration or usage error |
| `3` | Database connectivity or permissions error |

## Recommended Workflow

1. **On pull requests**: Run `check` to validate migrations before merge
2. **On push to main**: Run `up` to apply migrations to staging/production

```yaml
- name: Validate migrations (PR)
  if: github.event_name == 'pull_request'
  uses: defnotwig/pg-safe-migrate/action@v1
  with:
    command: check
    database_url: ${{ secrets.DATABASE_URL }}

- name: Apply migrations (push)
  if: github.ref == 'refs/heads/main'
  uses: defnotwig/pg-safe-migrate/action@v1
  with:
    command: up
    database_url: ${{ secrets.DATABASE_URL }}
```

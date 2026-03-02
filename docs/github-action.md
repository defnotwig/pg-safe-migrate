# CI with GitHub Action

pg-safe-migrate provides a GitHub Action for easy CI integration.

## Basic Setup

```yaml
name: Migrations
on: [push, pull_request]

jobs:
  check-migrations:
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
```

## Recommended Workflow

### Pull Requests — Validate

Run `check` to catch issues before merge:

```yaml
- name: Validate migrations
  if: github.event_name == 'pull_request'
  uses: defnotwig/pg-safe-migrate/action@v1
  with:
    command: check
    database_url: ${{ secrets.DATABASE_URL }}
    dir: ./migrations
```

### Push to Main — Apply

Apply migrations after merge:

```yaml
- name: Apply migrations
  if: github.ref == 'refs/heads/main'
  uses: defnotwig/pg-safe-migrate/action@v1
  with:
    command: up
    database_url: ${{ secrets.PRODUCTION_DATABASE_URL }}
    dir: ./migrations
```

## Complete Example

```yaml
name: Migration Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
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

      # Lint
      - name: Lint migrations
        uses: defnotwig/pg-safe-migrate/action@v1
        with:
          command: lint
          database_url: postgresql://postgres:postgres@localhost:5432/postgres

      # Check (lint + drift + config)
      - name: Full check
        uses: defnotwig/pg-safe-migrate/action@v1
        with:
          command: check
          database_url: postgresql://postgres:postgres@localhost:5432/postgres

      # Apply to test DB
      - name: Apply to test DB
        uses: defnotwig/pg-safe-migrate/action@v1
        with:
          command: up
          database_url: postgresql://postgres:postgres@localhost:5432/postgres

      # Verify status
      - name: Verify status
        uses: defnotwig/pg-safe-migrate/action@v1
        with:
          command: status
          database_url: postgresql://postgres:postgres@localhost:5432/postgres

  deploy:
    needs: validate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Apply to production
        uses: defnotwig/pg-safe-migrate/action@v1
        with:
          command: up
          database_url: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

## Action Inputs

See the [Action README](../action/README.md) for full input/output documentation.

## Using Without the Action

You can also run pg-safe-migrate directly in a workflow step:

```yaml
- name: Install
  run: npm install -g pg-safe-migrate

- name: Check
  run: pg-safe-migrate check --dir ./migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

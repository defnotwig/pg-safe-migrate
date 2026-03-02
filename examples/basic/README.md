# Basic Example

This example demonstrates a typical pg-safe-migrate setup.

## Setup

```bash
cd examples/basic
npm install
```

## Usage

```bash
# Set your database URL
export DATABASE_URL=postgresql://localhost:5432/mydb

# Check migrations
npx pg-safe-migrate check

# Apply migrations
npx pg-safe-migrate up

# Check status
npx pg-safe-migrate status
```

## Migrations

- `001_create_users` — Creates the users table
- `002_add_user_email_index` — Adds a concurrent index on email
- `003_create_posts` — Creates the posts table with a foreign key

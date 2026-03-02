CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL       PRIMARY KEY,
  title      TEXT         NOT NULL,
  slug       TEXT         NOT NULL UNIQUE,
  content    TEXT         NOT NULL DEFAULT '',
  published  BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

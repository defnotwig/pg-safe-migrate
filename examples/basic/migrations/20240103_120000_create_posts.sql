-- Migration: create posts table with FK (NOT VALID, then validate)
-- Safe: two-step foreign key pattern

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE posts
  ADD CONSTRAINT fk_posts_user
  FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;

ALTER TABLE posts VALIDATE CONSTRAINT fk_posts_user;

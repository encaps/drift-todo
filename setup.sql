-- Run this in the Neon SQL console (or any Postgres client)
-- Vercel automatically creates the database — you just need the tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Todos
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('daily', 'soon', 'someday')),
  view TEXT NOT NULL DEFAULT 'private' CHECK (view IN ('work', 'private')),
  completed BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  auth TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_todos_category ON todos (category);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos (completed);
CREATE INDEX IF NOT EXISTS idx_todos_view ON todos (view);

-- Migration: run this if the table already exists
-- ALTER TABLE todos ADD COLUMN IF NOT EXISTS view TEXT NOT NULL DEFAULT 'private' CHECK (view IN ('work', 'private'));
-- CREATE INDEX IF NOT EXISTS idx_todos_view ON todos (view);

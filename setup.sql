-- Run this in the Neon SQL console (or any Postgres client)
-- Vercel automatically creates the database — you just need the tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sections (dynamic views like Work, Private, Groceries, etc.)
CREATE TABLE IF NOT EXISTS sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default sections
INSERT INTO sections (key, label, icon, position) VALUES
  ('work', 'Work', '💼', 0),
  ('private', 'Private', '🏠', 1),
  ('groceries', 'Groceries', '🛒', 2)
ON CONFLICT (key) DO NOTHING;

-- Todos
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('daily', 'soon', 'someday')),
  view TEXT NOT NULL DEFAULT 'private',
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

-- Migration: run these if upgrading from hardcoded views to dynamic sections
-- 1. Create sections table (run the CREATE TABLE + INSERT above)
-- 2. Drop the old CHECK constraint on todos.view:
--    ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_view_check;
-- 3. Add index on sections:
--    CREATE INDEX IF NOT EXISTS idx_sections_position ON sections (position);

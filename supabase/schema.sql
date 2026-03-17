-- Run this entire file in your Supabase SQL editor (Database → SQL Editor)

-- ── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email        TEXT,
  display_name TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#D4673A',
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self" ON profiles
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Migration: add new columns if profiles table already exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT NOT NULL DEFAULT '#D4673A';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme        TEXT;

-- ── Habits ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_self" ON habits
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Habit completions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_completions (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date     DATE NOT NULL,
  UNIQUE(habit_id, date)
);
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habit_completions_self" ON habit_completions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Sleep entries ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sleep_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date       DATE NOT NULL,
  bedtime    TEXT NOT NULL,
  wakeup     TEXT NOT NULL,
  hours      NUMERIC(4,1) NOT NULL,
  quality    SMALLINT NOT NULL,
  score      SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);
ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sleep_entries_self" ON sleep_entries
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Mood logs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mood_logs (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date    DATE NOT NULL,
  score   SMALLINT NOT NULL,
  note    TEXT DEFAULT '',
  UNIQUE(user_id, date)
);
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mood_logs_self" ON mood_logs
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Events ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date       DATE NOT NULL,
  title      TEXT NOT NULL,
  time       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_self" ON events
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

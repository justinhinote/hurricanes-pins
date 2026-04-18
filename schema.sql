-- South Park Hurricanes Pin Design Contest
-- Run this once against your Neon database

CREATE TABLE IF NOT EXISTS rounds (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  brief      TEXT,
  status     TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rounds_status_check CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE TABLE IF NOT EXISTS pins (
  id           SERIAL PRIMARY KEY,
  round_id     INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  concept_text TEXT NOT NULL,
  prompt_used  TEXT NOT NULL,
  image_url    TEXT NOT NULL,
  blob_key     TEXT NOT NULL,
  is_winner    BOOLEAN NOT NULL DEFAULT FALSE,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
  id        SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pin_id    INTEGER NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  value     TEXT NOT NULL,
  voted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, pin_id),
  CONSTRAINT votes_value_check CHECK (value IN ('cash', 'trash'))
);

CREATE TABLE IF NOT EXISTS preference_snapshots (
  id                SERIAL PRIMARY KEY,
  round_id          INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  element_scores    JSONB NOT NULL,
  claude_analysis   TEXT NOT NULL,
  suggested_prompts JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_pin_id ON votes(pin_id);
CREATE INDEX IF NOT EXISTS idx_votes_player_id ON votes(player_id);
CREATE INDEX IF NOT EXISTS idx_pins_round_id ON pins(round_id);
CREATE INDEX IF NOT EXISTS idx_players_session_token ON players(session_token);

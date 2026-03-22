-- ══════════════════════════════════════════════════════════════════
-- Aiscern Feedback Learning Schema — Cloudflare D1
-- Run via: wrangler d1 execute detectai-pipeline --file=src/db/feedback-schema.sql
-- ══════════════════════════════════════════════════════════════════

-- 1. Signal Corrections — one row per user feedback event
CREATE TABLE IF NOT EXISTS signal_corrections (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  scan_id         TEXT NOT NULL,
  media_type      TEXT NOT NULL CHECK (media_type IN ('text','image','audio','video')),
  model_verdict   TEXT NOT NULL CHECK (model_verdict IN ('AI','HUMAN','UNCERTAIN')),
  correct_label   TEXT NOT NULL CHECK (correct_label IN ('AI','HUMAN')),
  confidence      REAL NOT NULL,
  signals_json    TEXT NOT NULL,   -- JSON array of {name, score, weight} objects
  feedback_type   TEXT NOT NULL CHECK (feedback_type IN ('correct','incorrect')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sc_media_type  ON signal_corrections(media_type);
CREATE INDEX IF NOT EXISTS idx_sc_correct_label ON signal_corrections(correct_label);
CREATE INDEX IF NOT EXISTS idx_sc_created_at  ON signal_corrections(created_at DESC);

-- 2. Correction Weights — aggregated hourly, read by inference engine
CREATE TABLE IF NOT EXISTS correction_weights (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type     TEXT NOT NULL,
  signal_name    TEXT NOT NULL,
  ai_mean        REAL NOT NULL DEFAULT 0.5,   -- mean signal score when correct_label=AI
  human_mean     REAL NOT NULL DEFAULT 0.5,   -- mean signal score when correct_label=HUMAN
  ai_count       INTEGER NOT NULL DEFAULT 0,
  human_count    INTEGER NOT NULL DEFAULT 0,
  correction_mag REAL NOT NULL DEFAULT 0.0,   -- magnitude of correction to apply
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(media_type, signal_name)
);

CREATE INDEX IF NOT EXISTS idx_cw_media_type ON correction_weights(media_type);

-- ============================================================
-- Aiscern — API Keys Table
-- Run in Supabase SQL Editor before using /api/v1/detect/text
-- Keys are stored as SHA-256 hashes — plaintext never persisted
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash        TEXT        UNIQUE NOT NULL,          -- SHA-256(actual_key)
  key_prefix      TEXT        NOT NULL,                 -- e.g. "ask_a1b2c3d4" shown in UI
  name            TEXT,                                 -- optional label set by user
  plan            TEXT        NOT NULL DEFAULT 'free'
                              CHECK (plan IN ('free','pro','enterprise')),
  monthly_limit   INTEGER     DEFAULT 500,              -- NULL = unlimited
  usage_count     INTEGER     NOT NULL DEFAULT 0,
  usage_reset_at  TIMESTAMPTZ DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  last_used_at    TIMESTAMPTZ,
  active          BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast key lookup by hash (called on every API request)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
-- Fast lookup of all keys for a user (settings page)
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id  ON api_keys(user_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can see and manage only their own keys
CREATE POLICY "Users manage own api keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id);

-- Service role has full access for server-side validation
CREATE POLICY "Service role full access to api_keys"
  ON api_keys FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── Monthly usage reset function ──────────────────────────────
-- Call this via a scheduled Supabase cron job (pg_cron):
--   SELECT cron.schedule('reset-api-usage', '0 0 1 * *', 'SELECT reset_api_key_usage()');
CREATE OR REPLACE FUNCTION reset_api_key_usage()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE api_keys
  SET
    usage_count   = 0,
    usage_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month'
  WHERE usage_reset_at <= NOW();
$$;

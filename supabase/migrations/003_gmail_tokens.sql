-- ─── Gmail OAuth tokens ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gmail_tokens (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_address  TEXT NOT NULL,
  access_token   TEXT NOT NULL,
  refresh_token  TEXT,
  token_expiry   TIMESTAMPTZ NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gmail_tokens: own rows" ON gmail_tokens
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Deduplication for synced Gmail messages ──────────────────────────────────

ALTER TABLE emails ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS emails_gmail_message_id_idx
  ON emails (user_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

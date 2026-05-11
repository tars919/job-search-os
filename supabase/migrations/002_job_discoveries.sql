-- ─── Job Discoveries ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_discoveries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  title            TEXT NOT NULL,
  company          TEXT NOT NULL,
  location         TEXT,
  work_mode        TEXT,
  salary_range     TEXT,
  source           TEXT NOT NULL DEFAULT 'manual',
  source_url       TEXT,
  description      TEXT,
  required_skills  TEXT[] NOT NULL DEFAULT '{}',
  posted_date      DATE,
  deadline         DATE,
  fit_score        INT,
  fit_why          TEXT[] NOT NULL DEFAULT '{}',
  missing_skills   TEXT[] NOT NULL DEFAULT '{}',
  saved            BOOLEAN NOT NULL DEFAULT false,
  applied          BOOLEAN NOT NULL DEFAULT false,
  rejected         BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE job_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_discoveries: own rows" ON job_discoveries
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

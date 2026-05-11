-- ─── User Profiles ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT,
  email               TEXT,
  target_roles        TEXT[] NOT NULL DEFAULT '{}',
  preferred_locations TEXT[] NOT NULL DEFAULT '{}',
  years_experience    INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles: own rows" ON user_profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── Jobs ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  company          TEXT NOT NULL,
  role             TEXT NOT NULL,
  status           TEXT NOT NULL,
  priority         TEXT,
  url              TEXT,
  location         TEXT,
  salary_range     TEXT,
  fit_score        TEXT,
  importance_score TEXT,
  notes            TEXT,
  saved_at         DATE,
  deadline         DATE,
  applied_at       DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs: own rows" ON jobs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Resources ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL,
  company      TEXT,
  role         TEXT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  file_name    TEXT,
  file_type    TEXT,
  file_size    INT,
  source_url   TEXT,
  content_text TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources: own rows" ON resources
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Prompts ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prompts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  title      TEXT NOT NULL,
  category   TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompts: own rows" ON prompts
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Research Notes ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS research_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  company    TEXT NOT NULL,
  content    TEXT NOT NULL,
  job_id     UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "research_notes: own rows" ON research_notes
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Outreach ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outreach (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,
  person_name       TEXT NOT NULL,
  company           TEXT NOT NULL,
  role              TEXT,
  relationship_type TEXT NOT NULL,
  channel           TEXT NOT NULL,
  status            TEXT NOT NULL,
  related_job_id    UUID,
  last_contacted_at DATE,
  follow_up_date    DATE,
  notes             TEXT,
  message_draft     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach: own rows" ON outreach
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Interviews ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  related_job_id        UUID,
  company               TEXT NOT NULL,
  role                  TEXT,
  round_name            TEXT NOT NULL,
  round_type            TEXT NOT NULL,
  interview_date        DATE,
  interviewer_name      TEXT,
  interviewer_role      TEXT,
  status                TEXT NOT NULL,
  prep_notes            TEXT,
  questions_to_practice TEXT,
  stories_to_use        TEXT,
  feedback              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interviews: own rows" ON interviews
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Events ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL,
  title                TEXT NOT NULL,
  event_type           TEXT NOT NULL,
  related_job_id       UUID,
  related_outreach_id  UUID,
  related_interview_id UUID,
  company              TEXT,
  start_date_time      TEXT NOT NULL,
  end_date_time        TEXT,
  location             TEXT,
  meeting_link         TEXT,
  notes                TEXT,
  status               TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events: own rows" ON events
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Emails ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emails (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL,
  sender_name              TEXT,
  sender_email             TEXT,
  company                  TEXT,
  subject                  TEXT,
  body                     TEXT NOT NULL,
  email_type               TEXT NOT NULL,
  related_job_id           UUID,
  detected_action          TEXT,
  detected_interview_date  DATE,
  detected_deadline        DATE,
  received_at              TIMESTAMPTZ,
  status                   TEXT NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emails: own rows" ON emails
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

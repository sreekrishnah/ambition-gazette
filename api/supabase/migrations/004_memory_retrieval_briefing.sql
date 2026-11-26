-- 005: structured memory, vector retrieval, per-user relevance, briefing and voice persistence.
-- Builds on 001 (world + user tables) and 002 (user_memory, daily_reports, report_items, bidi_*).
-- Domain: stories = persistent events, developments = updates to a story, report_items = personalised briefing rows.

BEGIN;

-- ---------------------------------------------------------------
-- Ambitions: first-class with priority and optional expiry
-- ---------------------------------------------------------------
ALTER TABLE public.ambitions
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.ambitions DROP CONSTRAINT IF EXISTS ambitions_priority_check;
ALTER TABLE public.ambitions ADD CONSTRAINT ambitions_priority_check CHECK (priority BETWEEN 1 AND 3);

ALTER TABLE public.ambitions DROP CONSTRAINT IF EXISTS ambitions_status_check;
ALTER TABLE public.ambitions ADD CONSTRAINT ambitions_status_check CHECK (status IN ('active', 'paused', 'achieved', 'archived'));

-- ---------------------------------------------------------------
-- Structured user memory
--   identity            stable facts (topic = profession | industry | location | language | role)
--   interest            long-term interest (strength, confidence, source)
--   temporary_interest  interest with valid_until
--   tracked_entity      entity or event the user asked to follow
--   suppression         explicit "not interested" (topic may be story:<id>, development:<id>, source:<domain> or free text)
--   temporary_suppression  suppression with valid_until
-- ---------------------------------------------------------------
ALTER TABLE public.user_memory
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS strength numeric,
  ADD COLUMN IF NOT EXISTS priority smallint;

ALTER TABLE public.user_memory DROP CONSTRAINT IF EXISTS user_memory_type_check;
ALTER TABLE public.user_memory ADD CONSTRAINT user_memory_type_check CHECK (
  memory_type IN ('identity', 'interest', 'temporary_interest', 'tracked_entity', 'suppression', 'temporary_suppression')
);
ALTER TABLE public.user_memory DROP CONSTRAINT IF EXISTS user_memory_status_check;
ALTER TABLE public.user_memory ADD CONSTRAINT user_memory_status_check CHECK (status IN ('active', 'archived'));
ALTER TABLE public.user_memory DROP CONSTRAINT IF EXISTS user_memory_strength_check;
ALTER TABLE public.user_memory ADD CONSTRAINT user_memory_strength_check CHECK (strength IS NULL OR (strength >= 0 AND strength <= 1));

CREATE UNIQUE INDEX IF NOT EXISTS user_memory_active_topic_uq
  ON public.user_memory (user_id, memory_type, topic)
  WHERE status = 'active' AND topic IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_memory_user_status_idx ON public.user_memory (user_id, status, memory_type);

-- ---------------------------------------------------------------
-- Explicit feedback log
-- ---------------------------------------------------------------
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS report_item_id uuid REFERENCES public.report_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_type_check;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_type_check CHECK (
  feedback_type IN (
    'relevant', 'not_relevant', 'already_know', 'too_much', 'more_like_this', 'less_like_this',
    'track', 'untrack', 'source_not_trusted', 'not_interested_temporarily'
  )
);
CREATE INDEX IF NOT EXISTS feedback_user_idx ON public.feedback (user_id, created_at DESC);

-- ---------------------------------------------------------------
-- Developments: continuity classification relative to the story's history
-- ---------------------------------------------------------------
ALTER TABLE public.developments
  ADD COLUMN IF NOT EXISTS continuity text,
  ADD COLUMN IF NOT EXISTS significance_reason text;

ALTER TABLE public.developments DROP CONSTRAINT IF EXISTS developments_continuity_check;
ALTER TABLE public.developments ADD CONSTRAINT developments_continuity_check CHECK (
  continuity IS NULL OR continuity IN ('new', 'updated', 'confirmed', 'contradicted', 'escalated', 'resolved', 'consequence')
);
CREATE INDEX IF NOT EXISTS developments_story_time_idx ON public.developments (story_id, occurred_at);

-- ---------------------------------------------------------------
-- Per-user evaluation ledger: world importance and personal relevance stay separate
-- ---------------------------------------------------------------
ALTER TABLE public.world_coverage
  ADD COLUMN IF NOT EXISTS ambition_id uuid REFERENCES public.ambitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS relevance_basis text,
  ADD COLUMN IF NOT EXISTS suppressed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suppressed_reason text;

-- ---------------------------------------------------------------
-- Briefing
-- ---------------------------------------------------------------
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS generated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS daily_reports_user_date_uq ON public.daily_reports (user_id, report_date);

ALTER TABLE public.report_items
  ADD COLUMN IF NOT EXISTS story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ambition_id uuid REFERENCES public.ambitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS continuity text,
  ADD COLUMN IF NOT EXISTS what_changed text,
  ADD COLUMN IF NOT EXISTS world_significance numeric,
  ADD COLUMN IF NOT EXISTS personal_relevance numeric,
  ADD COLUMN IF NOT EXISTS relevance_basis text;

CREATE UNIQUE INDEX IF NOT EXISTS report_items_report_dev_uq ON public.report_items (report_id, development_id);

-- ---------------------------------------------------------------
-- Tracked stories: an ambition link is optional, one row per user and story
-- ---------------------------------------------------------------
ALTER TABLE public.tracked_stories DROP CONSTRAINT IF EXISTS tracked_stories_user_id_story_id_ambition_id_key;
ALTER TABLE public.tracked_stories ALTER COLUMN ambition_id DROP NOT NULL;
ALTER TABLE public.tracked_stories ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.tracked_stories DROP CONSTRAINT IF EXISTS tracked_stories_user_story_uq;
ALTER TABLE public.tracked_stories ADD CONSTRAINT tracked_stories_user_story_uq UNIQUE (user_id, story_id);

-- ---------------------------------------------------------------
-- Voice sessions and pipeline jobs
-- ---------------------------------------------------------------
ALTER TABLE public.bidi_sessions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS end_reason text,
  ADD COLUMN IF NOT EXISTS transcript jsonb,
  ADD COLUMN IF NOT EXISTS summary jsonb,
  ADD COLUMN IF NOT EXISTS discussed_story_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS bidi_sessions_user_idx ON public.bidi_sessions (user_id, started_at DESC);

ALTER TABLE public.fetch_jobs ADD COLUMN IF NOT EXISTS stats jsonb;
CREATE INDEX IF NOT EXISTS fetch_jobs_user_idx ON public.fetch_jobs (user_id, created_at DESC);

-- ---------------------------------------------------------------
-- Vector indexes (cosine)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ambitions_embedding_idx ON public.ambitions USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS stories_embedding_idx ON public.stories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS developments_embedding_idx ON public.developments USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS user_memory_embedding_idx ON public.user_memory USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------
-- Retrieval functions. Called by the backend with the service role only.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_ambitions(p_user_id uuid, p_embedding vector(768), p_limit integer DEFAULT 5)
RETURNS TABLE (id uuid, title text, description text, horizon text, geography text, priority smallint, similarity double precision)
LANGUAGE sql STABLE AS $$
  SELECT a.id, a.title, a.description, a.horizon, a.geography, a.priority,
         1 - (a.embedding <=> p_embedding) AS similarity
  FROM public.ambitions a
  WHERE a.user_id = p_user_id
    AND a.status = 'active'
    AND (a.expires_at IS NULL OR a.expires_at > now())
    AND a.embedding IS NOT NULL
  ORDER BY a.embedding <=> p_embedding
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.match_stories(p_embedding vector(768), p_limit integer DEFAULT 5, p_since timestamptz DEFAULT NULL)
RETURNS TABLE (id uuid, title text, summary text, category text, geography text, last_updated_at timestamptz, similarity double precision)
LANGUAGE sql STABLE AS $$
  SELECT s.id, s.title, s.summary, s.category, s.geography, s.last_updated_at,
         1 - (s.embedding <=> p_embedding) AS similarity
  FROM public.stories s
  WHERE s.status = 'active'
    AND s.embedding IS NOT NULL
    AND (p_since IS NULL OR s.last_updated_at >= p_since)
  ORDER BY s.embedding <=> p_embedding
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.match_developments(p_embedding vector(768), p_story_id uuid DEFAULT NULL, p_limit integer DEFAULT 5, p_since timestamptz DEFAULT NULL)
RETURNS TABLE (id uuid, story_id uuid, headline text, what_changed text, occurred_at timestamptz, similarity double precision)
LANGUAGE sql STABLE AS $$
  SELECT d.id, d.story_id, d.headline, d.what_changed, d.occurred_at,
         1 - (d.embedding <=> p_embedding) AS similarity
  FROM public.developments d
  WHERE d.embedding IS NOT NULL
    AND (p_story_id IS NULL OR d.story_id = p_story_id)
    AND (p_since IS NULL OR d.occurred_at >= p_since)
  ORDER BY d.embedding <=> p_embedding
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.match_memory(p_user_id uuid, p_embedding vector(768), p_limit integer DEFAULT 10)
RETURNS TABLE (id uuid, memory_type text, topic text, content text, strength numeric, confidence numeric, source text, valid_until timestamptz, structured_value jsonb, similarity double precision)
LANGUAGE sql STABLE AS $$
  SELECT m.id, m.memory_type, m.topic, m.content, m.strength, m.confidence, m.source, m.valid_until, m.structured_value,
         1 - (m.embedding <=> p_embedding) AS similarity
  FROM public.user_memory m
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
    AND (m.valid_until IS NULL OR m.valid_until > now())
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.match_ambitions(uuid, vector, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_stories(vector, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_developments(vector, uuid, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_memory(uuid, vector, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_ambitions(uuid, vector, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_stories(vector, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_developments(vector, uuid, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_memory(uuid, vector, integer) TO service_role;

COMMIT;

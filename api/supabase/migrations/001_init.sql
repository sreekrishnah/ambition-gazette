-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION current_ist_date()
RETURNS date AS $$
  SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION acquire_gdelt_slot(p_caller text)
RETURNS timestamptz AS $$
DECLARE
  v_next_allowed timestamptz;
BEGIN
  SELECT
    GREATEST(NOW(), COALESCE(last_request_at + interval '5.1 seconds', NOW()))
  INTO v_next_allowed
  FROM public.gdelt_rate_gate
  WHERE id = 'singleton'
  FOR UPDATE;

  UPDATE public.gdelt_rate_gate
  SET last_request_at = v_next_allowed,
      locked_by = p_caller
  WHERE id = 'singleton';

  RETURN v_next_allowed;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TABLES
-- ==========================================

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  password_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.ambitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  horizon text,
  geography text,
  status text DEFAULT 'active',
  scenario_id text,
  embedding vector(768),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.ambition_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambition_id uuid NOT NULL REFERENCES public.ambitions(id) ON DELETE CASCADE,
  sector text,
  geography text[],
  target_market text,
  time_horizon text,
  goals_json jsonb,
  constraints_json jsonb,
  search_concepts text[],
  status text DEFAULT 'current',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.user_intelligence_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  role text,
  activity text,
  ambition text,
  direction text,
  timeline text,
  categories text[],
  geography_focus text,
  depth text,
  prefered_language text,
  report_language text,
  embedding vector(768),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.temporal_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  memory_type text,
  content text,
  source_interaction text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.ambition_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambition_id uuid NOT NULL REFERENCES public.ambitions(id) ON DELETE CASCADE,
  type text,
  label text,
  description text,
  importance text,
  embedding vector(768),
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambition_id uuid NOT NULL REFERENCES public.ambitions(id) ON DELETE CASCADE,
  statement text,
  status text DEFAULT 'ACTIVE',
  confidence numeric,
  created_at timestamptz DEFAULT now(),
  last_evaluated_at timestamptz,
  changed_at timestamptz
);

CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_url text UNIQUE NOT NULL,
  title text NOT NULL,
  snippet text,
  publisher text,
  published_at timestamptz,
  source_country text,
  language text,
  image_url text,
  gdelt_query text,
  scenario_id text,
  embedding vector(768),
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text,
  category text,
  entities_json jsonb,
  geography text,
  first_seen_at timestamptz,
  last_updated_at timestamptz,
  status text DEFAULT 'active',
  world_significance numeric,
  significance_reason text,
  scenario_id text,
  embedding vector(768),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.developments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  canonical_event_key text,
  headline text NOT NULL,
  summary text,
  development_type text,
  state_change_type text,
  occurred_at timestamptz,
  first_reported_at timestamptz,
  source_count integer,
  independent_source_count integer,
  evidence_strength text,
  world_significance numeric,
  what_changed text NOT NULL,
  previous_state text NOT NULL,
  new_state text NOT NULL,
  evidence_json jsonb,
  scenario_id text,
  embedding vector(768),
  created_at timestamptz DEFAULT now(),
  UNIQUE(story_id, canonical_event_key)
);

CREATE TABLE public.story_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  development_id uuid REFERENCES public.developments(id) ON DELETE SET NULL,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  publisher text,
  published_at timestamptz,
  snippet text,
  UNIQUE(article_id, development_id)
);

CREATE TABLE public.tracked_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  ambition_id uuid NOT NULL REFERENCES public.ambitions(id) ON DELETE CASCADE,
  tracked_at timestamptz NOT NULL DEFAULT now(),
  last_seen_development_id uuid REFERENCES public.developments(id),
  importance text,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, story_id, ambition_id)
);

CREATE TABLE public.world_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id uuid NOT NULL REFERENCES public.developments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  world_significance numeric,
  significance_reason text,
  override_triggered boolean,
  override_type text,
  must_know boolean,
  suppression_allowed boolean,
  shown_to_user boolean,
  shown_at timestamptz,
  personal_relevance numeric,
  relevance_reasons jsonb,
  evaluated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, development_id),
  CHECK(NOT(must_know = true AND suppression_allowed = true))
);

CREATE TABLE public.investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ambition_id uuid NOT NULL REFERENCES public.ambitions(id) ON DELETE CASCADE,
  trigger_development_id uuid NOT NULL REFERENCES public.developments(id) ON DELETE CASCADE,
  status text DEFAULT 'PENDING',
  effective_at timestamptz,
  volatility_level text,
  volatility_reasons text[],
  overall_confidence numeric,
  situation_summary text,
  strengthen_conditions jsonb,
  weaken_conditions jsonb,
  reverse_conditions jsonb,
  attempt_count integer DEFAULT 1,
  last_error text,
  scenario_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ambition_id, trigger_development_id)
);

CREATE TABLE public.investigation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  step_type text,
  attempt_number integer DEFAULT 1,
  status text,
  duration_ms integer,
  metadata_json jsonb,
  error_detail text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(investigation_id, step_type, attempt_number)
);

CREATE TABLE public.investigation_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  assumption_id uuid REFERENCES public.assumptions(id) ON DELETE SET NULL,
  claim_type text,
  claim_text text,
  assessment text,
  confidence numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.claim_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.investigation_claims(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  relationship text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(claim_id, article_id, relationship)
);

CREATE TABLE public.investigation_dependency_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  development_id uuid NOT NULL REFERENCES public.developments(id) ON DELETE CASCADE,
  dependency_id uuid NOT NULL REFERENCES public.ambition_dependencies(id) ON DELETE CASCADE,
  impact_type text,
  explanation text,
  confidence numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.assumption_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id uuid NOT NULL REFERENCES public.assumptions(id) ON DELETE CASCADE,
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  previous_status text,
  new_status text,
  previous_confidence numeric,
  new_confidence numeric,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.assumption_evaluation_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_evaluation_id uuid NOT NULL REFERENCES public.assumption_evaluations(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.investigation_claims(id) ON DELETE CASCADE,
  UNIQUE(assumption_evaluation_id, claim_id)
);

CREATE TABLE public.simulation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  scenario_id text,
  current_simulated_at timestamptz,
  previous_simulated_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.daily_pipeline_counter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  run_date date NOT NULL,
  run_count integer DEFAULT 1,
  last_run_at timestamptz DEFAULT now(),
  UNIQUE(user_id, run_date)
);

CREATE TABLE public.gdelt_rate_gate (
  id text PRIMARY KEY DEFAULT 'singleton',
  last_request_at timestamptz,
  locked_by text
);

INSERT INTO public.gdelt_rate_gate (id, last_request_at, locked_by) VALUES ('singleton', NULL, NULL) ON CONFLICT DO NOTHING;

CREATE TABLE public.fetch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trigger text,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.batch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_for timestamptz UNIQUE NOT NULL,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  users_processed integer,
  users_total integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL,
  development_id uuid REFERENCES public.developments(id) ON DELETE SET NULL,
  assumption_id uuid REFERENCES public.assumptions(id) ON DELETE SET NULL,
  investigation_id uuid REFERENCES public.investigations(id) ON DELETE SET NULL,
  feedback_type text,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION consume_daily_run(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.daily_pipeline_counter (user_id, run_date, run_count, last_run_at)
  VALUES (p_user_id, current_ist_date(), 1, NOW())
  ON CONFLICT (user_id, run_date)
  DO UPDATE SET
    run_count = public.daily_pipeline_counter.run_count + 1,
    last_run_at = NOW()
  WHERE public.daily_pipeline_counter.run_count < 3
  RETURNING run_count INTO v_count;

  RETURN v_count IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambition_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambition_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assumption_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assumption_evaluation_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_dependency_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_pipeline_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fetch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdelt_rate_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_runs ENABLE ROW LEVEL SECURITY;

-- Shared read for world tables
CREATE POLICY "Shared read articles" ON public.articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shared read stories" ON public.stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shared read developments" ON public.developments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shared read story_sources" ON public.story_sources FOR SELECT TO authenticated USING (true);

-- User-isolated policies
CREATE POLICY "User isolation users" ON public.users FOR ALL TO authenticated USING (auth.uid() = id);
CREATE POLICY "User isolation ambitions" ON public.ambitions FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation world_coverage" ON public.world_coverage FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation tracked_stories" ON public.tracked_stories FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation investigations" ON public.investigations FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation simulation_state" ON public.simulation_state FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation daily_pipeline_counter" ON public.daily_pipeline_counter FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation fetch_jobs" ON public.fetch_jobs FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation feedback" ON public.feedback FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "User isolation ambition_context" ON public.ambition_context FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ambitions a WHERE a.id = ambition_context.ambition_id AND a.user_id = auth.uid())
);
CREATE POLICY "User isolation ambition_dependencies" ON public.ambition_dependencies FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ambitions a WHERE a.id = ambition_dependencies.ambition_id AND a.user_id = auth.uid())
);
CREATE POLICY "User isolation assumptions" ON public.assumptions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ambitions a WHERE a.id = assumptions.ambition_id AND a.user_id = auth.uid())
);

CREATE POLICY "User isolation investigation_steps" ON public.investigation_steps FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = investigation_steps.investigation_id AND i.user_id = auth.uid())
);
CREATE POLICY "User isolation investigation_claims" ON public.investigation_claims FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = investigation_claims.investigation_id AND i.user_id = auth.uid())
);
CREATE POLICY "User isolation investigation_dependency_impacts" ON public.investigation_dependency_impacts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = investigation_dependency_impacts.investigation_id AND i.user_id = auth.uid())
);
CREATE POLICY "User isolation assumption_evaluations" ON public.assumption_evaluations FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = assumption_evaluations.investigation_id AND i.user_id = auth.uid())
);
CREATE POLICY "User isolation claim_evidence" ON public.claim_evidence FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.investigation_claims c
    JOIN public.investigations i ON i.id = c.investigation_id
    WHERE c.id = claim_evidence.claim_id AND i.user_id = auth.uid()
  )
);
CREATE POLICY "User isolation assumption_evaluation_claims" ON public.assumption_evaluation_claims FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.assumption_evaluations e
    JOIN public.investigations i ON i.id = e.investigation_id
    WHERE e.id = assumption_evaluation_claims.assumption_evaluation_id AND i.user_id = auth.uid()
  )
);

-- ==========================================
-- BIDI AND MEMORY LAYER MIGRATION
-- ==========================================

CREATE TABLE public.user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  memory_type text NOT NULL,
  content text NOT NULL,
  structured_value jsonb,
  confidence numeric,
  source text,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  embedding vector(768),
  status text DEFAULT 'active'
);

CREATE TABLE public.memory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  memory_id uuid REFERENCES public.user_memory(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  old_value text,
  new_value text,
  source text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  run_id text,
  report_date date NOT NULL,
  summary text,
  overall_context text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  development_id uuid REFERENCES public.developments(id) ON DELETE SET NULL,
  headline text NOT NULL,
  summary text,
  why_it_matters text,
  confidence numeric,
  evidence_strength text,
  sources jsonb,
  relevance_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.bidi_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_id uuid REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  language text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE public.bidi_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.bidi_sessions(id) ON DELETE CASCADE,
  report_item_id uuid REFERENCES public.report_items(id) ON DELETE SET NULL,
  feedback_type text NOT NULL,
  feedback_text text,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bidi_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bidi_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User isolation user_memory" ON public.user_memory FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation memory_events" ON public.memory_events FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation daily_reports" ON public.daily_reports FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation report_items" ON public.report_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.daily_reports r WHERE r.id = report_items.report_id AND r.user_id = auth.uid())
);
CREATE POLICY "User isolation bidi_sessions" ON public.bidi_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation bidi_feedback" ON public.bidi_feedback FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bidi_sessions s WHERE s.id = bidi_feedback.session_id AND s.user_id = auth.uid())
);

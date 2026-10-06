-- The question a challenged assumption leaves the person with (AI interpretation, never a recommendation).
ALTER TABLE public.report_items
  ADD COLUMN IF NOT EXISTS assumption_reconsider text;

-- Belief state for each user-stated assumption: every development that tests it is stored as a signal,
-- the state is derived from those signals, and the person's own decisions are kept as history.
ALTER TABLE public.ambition_assumptions DROP CONSTRAINT IF EXISTS ambition_assumptions_status_check;
ALTER TABLE public.ambition_assumptions
  ADD CONSTRAINT ambition_assumptions_status_check CHECK (status IN ('holding', 'watch', 'challenged'));

-- Signals recorded before decided_at were already seen and answered by the person, so they no longer count.
ALTER TABLE public.ambition_assumptions ADD COLUMN IF NOT EXISTS decided_at timestamptz;

CREATE TABLE IF NOT EXISTS public.assumption_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id uuid NOT NULL REFERENCES public.ambition_assumptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  development_id uuid NOT NULL REFERENCES public.developments(id) ON DELETE CASCADE,
  effect text NOT NULL CHECK (effect IN ('challenges', 'supports', 'opportunity')),
  reason text NOT NULL,
  reconsider text,
  confidence real NOT NULL,
  publisher_count integer NOT NULL DEFAULT 1,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assumption_id, development_id)
);
CREATE INDEX IF NOT EXISTS assumption_signals_assumption_idx ON public.assumption_signals (assumption_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.assumption_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id uuid NOT NULL REFERENCES public.ambition_assumptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('keep', 'dismiss', 'change_plan')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assumption_decisions_assumption_idx ON public.assumption_decisions (assumption_id, created_at DESC);

ALTER TABLE public.assumption_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assumption_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User isolation assumption_signals" ON public.assumption_signals FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation assumption_decisions" ON public.assumption_decisions FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Briefing items now carry any assumption effect (challenge, support or opportunity), not only challenges.
ALTER TABLE public.report_items ADD COLUMN IF NOT EXISTS assumption_effect text
  CHECK (assumption_effect IS NULL OR assumption_effect IN ('challenges', 'supports', 'opportunity'));
UPDATE public.report_items SET assumption_effect = 'challenges' WHERE assumption_id IS NOT NULL AND assumption_effect IS NULL;

-- One short, actionable summary per ambition per period. Recent days are summarised one by one; as they age they
-- are rolled up into a week, then a month, then a year. items_hash lets a summary be rewritten only when the
-- developments it covers change.
CREATE TABLE IF NOT EXISTS public.ambition_period_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ambition_id uuid NOT NULL REFERENCES public.ambitions(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('day', 'week', 'month', 'year')),
  period_start date NOT NULL,
  summary text NOT NULL,
  items_hash text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ambition_id, period, period_start)
);
ALTER TABLE public.ambition_period_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User isolation ambition_period_summaries" ON public.ambition_period_summaries FOR ALL TO authenticated USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

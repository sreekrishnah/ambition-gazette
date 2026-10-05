-- User-stated assumptions behind an ambition, and attention tiers for briefing items.
-- Assumptions are written only by the user; a development can mark one "challenged" but never creates one.
CREATE TABLE IF NOT EXISTS public.ambition_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambition_id uuid NOT NULL REFERENCES public.ambitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  statement text NOT NULL,
  status text NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'challenged')),
  challenged_by_development_id uuid REFERENCES public.developments(id) ON DELETE SET NULL,
  challenged_at timestamptz,
  challenge_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ambition_assumptions_ambition_idx ON public.ambition_assumptions (ambition_id);

ALTER TABLE public.ambition_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User isolation ambition_assumptions" ON public.ambition_assumptions FOR ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.world_coverage
  ADD COLUMN IF NOT EXISTS attention text CHECK (attention IS NULL OR attention IN ('act', 'know', 'fyi'));

ALTER TABLE public.report_items
  ADD COLUMN IF NOT EXISTS attention text CHECK (attention IS NULL OR attention IN ('act', 'know', 'fyi')),
  ADD COLUMN IF NOT EXISTS assumption_id uuid REFERENCES public.ambition_assumptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assumption_note text;

CREATE INDEX IF NOT EXISTS world_coverage_ambition_idx ON public.world_coverage (user_id, ambition_id, shown_to_user);

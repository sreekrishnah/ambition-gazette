-- Reality-to-Action Intelligence: user-approved commitments are the canonical
-- record. The system may propose, but never creates an accepted commitment or
-- infers an outcome without the user's confirmation.
CREATE TABLE IF NOT EXISTS public.action_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ambition_id uuid NOT NULL REFERENCES public.ambitions(id) ON DELETE CASCADE,
  assumption_id uuid REFERENCES public.ambition_assumptions(id) ON DELETE SET NULL,
  development_id uuid REFERENCES public.developments(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 240),
  expected_outcome text,
  rationale text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'scheduled', 'in_progress', 'completed', 'blocked', 'dismissed', 'superseded', 'expired')),
  review_at timestamptz,
  accepted_at timestamptz,
  resolved_at timestamptz,
  resolution_reason text,
  superseded_by uuid REFERENCES public.action_commitments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS action_commitments_user_status_review_idx ON public.action_commitments(user_id, status, review_at);
CREATE INDEX IF NOT EXISTS action_commitments_ambition_idx ON public.action_commitments(ambition_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.commitment_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES public.action_commitments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('accepted', 'scheduled', 'progress', 'completed', 'blocked', 'rescheduled', 'dismissed', 'superseded', 'reassessed')),
  note text,
  blocker text,
  next_step text,
  review_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commitment_updates_commitment_idx ON public.commitment_updates(commitment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.commitment_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES public.action_commitments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url text,
  label text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (url IS NOT NULL OR note IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.commitment_reassessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES public.action_commitments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  development_id uuid REFERENCES public.developments(id) ON DELETE SET NULL,
  recommendation text NOT NULL CHECK (recommendation IN ('continue', 'change', 'close')),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.behavioural_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  observation_type text NOT NULL CHECK (observation_type IN ('completion_pattern', 'rescheduling_pattern', 'blocker_pattern', 'preference')),
  statement text NOT NULL,
  evidence_count integer NOT NULL DEFAULT 1 CHECK (evidence_count > 0),
  confidence real NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  status text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'confirmed', 'dismissed')),
  source_commitment_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS behavioural_observations_user_status_idx ON public.behavioural_observations(user_id, status, created_at DESC);

ALTER TABLE public.action_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_reassessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioural_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User isolation action_commitments" ON public.action_commitments FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation commitment_updates" ON public.commitment_updates FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation commitment_evidence" ON public.commitment_evidence FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation commitment_reassessments" ON public.commitment_reassessments FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User isolation behavioural_observations" ON public.behavioural_observations FOR ALL TO authenticated USING (auth.uid() = user_id);

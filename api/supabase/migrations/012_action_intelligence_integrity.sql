-- Canonical action integrity.  This migration is additive and safe after 011.
ALTER TABLE public.action_commitments ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.action_commitments ADD COLUMN IF NOT EXISTS action_fingerprint text;
ALTER TABLE public.action_commitments ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE public.action_commitments ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS action_commitments_user_idempotency_key_idx
  ON public.action_commitments(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS action_commitments_active_fingerprint_idx
  ON public.action_commitments(user_id, development_id, action_fingerprint)
  WHERE development_id IS NOT NULL AND status NOT IN ('completed','dismissed','superseded','expired');

CREATE TABLE IF NOT EXISTS public.commitment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  commitment_id uuid NOT NULL REFERENCES public.action_commitments(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('review_due','review_missed','reassessment_ready')),
  scheduled_for timestamptz NOT NULL,
  delivered_at timestamptz,
  read_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','failed','cancelled')),
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(commitment_id, kind, scheduled_for)
);
CREATE INDEX IF NOT EXISTS commitment_notifications_due_idx ON public.commitment_notifications(status, scheduled_for);

CREATE TABLE IF NOT EXISTS public.commitment_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL UNIQUE,
  job_type text NOT NULL CHECK (job_type IN ('review_notifications','event_reassessment','relate_projection')),
  status text NOT NULL CHECK (status IN ('started','completed','failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
CREATE UNIQUE INDEX IF NOT EXISTS commitment_reassessments_commitment_development_idx
  ON public.commitment_reassessments(commitment_id, development_id);

-- Histories are append-only records. Corrections are represented by another update,
-- never by modifying or deleting an earlier user response.
CREATE OR REPLACE FUNCTION public.prevent_commitment_history_mutation()
RETURNS trigger AS $$ BEGIN
  RAISE EXCEPTION 'Commitment history is append-only';
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS commitment_updates_immutable ON public.commitment_updates;
CREATE TRIGGER commitment_updates_immutable BEFORE UPDATE OR DELETE ON public.commitment_updates
FOR EACH ROW EXECUTE FUNCTION public.prevent_commitment_history_mutation();
DROP TRIGGER IF EXISTS commitment_evidence_immutable ON public.commitment_evidence;
CREATE TRIGGER commitment_evidence_immutable BEFORE UPDATE OR DELETE ON public.commitment_evidence
FOR EACH ROW EXECUTE FUNCTION public.prevent_commitment_history_mutation();

ALTER TABLE public.commitment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_job_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User isolation commitment_notifications" ON public.commitment_notifications FOR ALL TO authenticated USING (auth.uid() = user_id);

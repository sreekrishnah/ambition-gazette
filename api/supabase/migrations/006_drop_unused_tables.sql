-- Removes tables left over from a design that was cut (assumptions, dependencies, an investigator
-- state machine, a simulation clock). Nothing in the API reads or writes them.
ALTER TABLE public.feedback
  DROP COLUMN IF EXISTS assumption_id,
  DROP COLUMN IF EXISTS investigation_id;

DROP TABLE IF EXISTS public.assumption_evaluation_claims CASCADE;
DROP TABLE IF EXISTS public.assumption_evaluations CASCADE;
DROP TABLE IF EXISTS public.investigation_dependency_impacts CASCADE;
DROP TABLE IF EXISTS public.claim_evidence CASCADE;
DROP TABLE IF EXISTS public.investigation_claims CASCADE;
DROP TABLE IF EXISTS public.investigation_steps CASCADE;
DROP TABLE IF EXISTS public.investigations CASCADE;
DROP TABLE IF EXISTS public.ambition_dependencies CASCADE;
DROP TABLE IF EXISTS public.assumptions CASCADE;
DROP TABLE IF EXISTS public.simulation_state CASCADE;
DROP TABLE IF EXISTS public.temporal_memory CASCADE;

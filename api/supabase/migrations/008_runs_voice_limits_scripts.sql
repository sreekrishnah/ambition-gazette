-- Long-running refreshes report progress and a heartbeat, so a run is judged by whether it is alive, not by a fixed timeout.
ALTER TABLE public.fetch_jobs
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS progress text;

-- Two refreshes per user per day (the scheduled 06:00 run counts as one).
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
  WHERE public.daily_pipeline_counter.run_count < 2
  RETURNING run_count INTO v_count;

  RETURN v_count IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Voice usage per user per IST day. The gate is atomic so two simultaneous starts cannot both pass.
CREATE TABLE IF NOT EXISTS public.daily_voice_usage (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  sessions integer NOT NULL DEFAULT 0,
  tokens bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);
ALTER TABLE public.daily_voice_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User isolation daily_voice_usage" ON public.daily_voice_usage FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Returns 'ok' and counts the session, or 'sessions' / 'tokens' naming the limit that was reached.
CREATE OR REPLACE FUNCTION consume_voice_session(p_user_id uuid, p_session_limit integer, p_token_limit bigint)
RETURNS text AS $$
DECLARE
  v_row public.daily_voice_usage;
BEGIN
  INSERT INTO public.daily_voice_usage (user_id, usage_date)
  VALUES (p_user_id, current_ist_date())
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT * INTO v_row FROM public.daily_voice_usage
  WHERE user_id = p_user_id AND usage_date = current_ist_date()
  FOR UPDATE;

  IF v_row.sessions >= p_session_limit THEN RETURN 'sessions'; END IF;
  IF v_row.tokens >= p_token_limit THEN RETURN 'tokens'; END IF;

  UPDATE public.daily_voice_usage SET sessions = sessions + 1
  WHERE user_id = p_user_id AND usage_date = current_ist_date();
  RETURN 'ok';
END;
$$ LANGUAGE plpgsql;

-- A session that failed to start does not use up one of the day's sessions.
CREATE OR REPLACE FUNCTION refund_voice_session(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.daily_voice_usage SET sessions = GREATEST(0, sessions - 1)
  WHERE user_id = p_user_id AND usage_date = current_ist_date();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_voice_tokens(p_user_id uuid, p_tokens bigint)
RETURNS void AS $$
BEGIN
  INSERT INTO public.daily_voice_usage (user_id, usage_date, tokens)
  VALUES (p_user_id, current_ist_date(), GREATEST(0, p_tokens))
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET tokens = public.daily_voice_usage.tokens + GREATEST(0, p_tokens);
END;
$$ LANGUAGE plpgsql;

-- The complete spoken script the voice agent performs, generated after each refresh from the stored briefing.
CREATE TABLE IF NOT EXISTS public.briefing_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  script jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id)
);
ALTER TABLE public.briefing_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User isolation briefing_scripts" ON public.briefing_scripts FOR ALL TO authenticated USING (auth.uid() = user_id);

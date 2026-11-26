-- Users get a daily "something may affect your plan" email by default and can stop it from the email itself.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_alerts boolean NOT NULL DEFAULT true;

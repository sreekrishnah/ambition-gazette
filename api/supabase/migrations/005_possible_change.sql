-- A one-sentence, hedged consequence of a development for the user's ambition. Null when no ambition link exists.
ALTER TABLE public.report_items
  ADD COLUMN IF NOT EXISTS could_change text;

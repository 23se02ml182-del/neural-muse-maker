-- Create saved_logos collection table used by "Save Selected" / "Save All" actions.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.saved_logos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  style text,
  color_palette text,
  industry text,
  icon_idea text,
  image_data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_logos_user_created_at
  ON public.saved_logos (user_id, created_at DESC);

ALTER TABLE public.saved_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved logos" ON public.saved_logos;
DROP POLICY IF EXISTS "Users can insert their own saved logos" ON public.saved_logos;
DROP POLICY IF EXISTS "Users can update their own saved logos" ON public.saved_logos;
DROP POLICY IF EXISTS "Users can delete their own saved logos" ON public.saved_logos;
DROP POLICY IF EXISTS "Service role full access saved logos" ON public.saved_logos;

CREATE POLICY "Users can view their own saved logos"
ON public.saved_logos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved logos"
ON public.saved_logos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved logos"
ON public.saved_logos
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved logos"
ON public.saved_logos
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access saved logos"
ON public.saved_logos
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Align logo_generations schema for history + downloads across older installs.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.logo_generations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  tagline text,
  industry text NOT NULL DEFAULT 'General',
  style text NOT NULL DEFAULT 'mascot',
  colors text[],
  mood text,
  additional_instructions text,
  prompt_used text NOT NULL DEFAULT 'pending',
  image_url text,
  provider text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  generation_ms integer,
  was_downloaded boolean NOT NULL DEFAULT false,
  was_regenerated boolean NOT NULL DEFAULT false,
  user_rating smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS style text;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS colors text[];
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS mood text;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS additional_instructions text;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS generation_ms integer;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS was_downloaded boolean;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS was_regenerated boolean;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS user_rating smallint;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.logo_generations ADD COLUMN IF NOT EXISTS prompt_used text;

UPDATE public.logo_generations
SET business_name = COALESCE(NULLIF(trim(business_name), ''), 'Untitled Brand')
WHERE business_name IS NULL OR trim(business_name) = '';

UPDATE public.logo_generations
SET industry = COALESCE(NULLIF(trim(industry), ''), 'General')
WHERE industry IS NULL OR trim(industry) = '';

UPDATE public.logo_generations
SET style = COALESCE(NULLIF(trim(style), ''), 'mascot')
WHERE style IS NULL OR trim(style) = '';

UPDATE public.logo_generations
SET prompt_used = COALESCE(NULLIF(trim(prompt_used), ''), 'pending')
WHERE prompt_used IS NULL OR trim(prompt_used) = '';

UPDATE public.logo_generations
SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending', 'processing', 'completed', 'failed');

UPDATE public.logo_generations
SET was_downloaded = COALESCE(was_downloaded, false),
    was_regenerated = COALESCE(was_regenerated, false),
    updated_at = COALESCE(updated_at, created_at, now());

ALTER TABLE public.logo_generations
  ALTER COLUMN business_name SET NOT NULL,
  ALTER COLUMN industry SET NOT NULL,
  ALTER COLUMN style SET NOT NULL,
  ALTER COLUMN prompt_used SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN was_downloaded SET DEFAULT false,
  ALTER COLUMN was_downloaded SET NOT NULL,
  ALTER COLUMN was_regenerated SET DEFAULT false,
  ALTER COLUMN was_regenerated SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'logo_generations_status_check'
      AND conrelid = 'public.logo_generations'::regclass
  ) THEN
    ALTER TABLE public.logo_generations
      ADD CONSTRAINT logo_generations_status_check
      CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'logo_generations_user_rating_check'
      AND conrelid = 'public.logo_generations'::regclass
  ) THEN
    ALTER TABLE public.logo_generations
      ADD CONSTRAINT logo_generations_user_rating_check
      CHECK (user_rating BETWEEN 1 AND 5);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.set_logo_generations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_logo_generations_updated_at ON public.logo_generations;
CREATE TRIGGER trg_logo_generations_updated_at
BEFORE UPDATE ON public.logo_generations
FOR EACH ROW EXECUTE FUNCTION public.set_logo_generations_updated_at();

CREATE INDEX IF NOT EXISTS idx_logo_generations_user_recent ON public.logo_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logo_generations_status ON public.logo_generations(status);
CREATE INDEX IF NOT EXISTS idx_logo_generations_created_at ON public.logo_generations(created_at DESC);

ALTER TABLE public.logo_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role all" ON public.logo_generations;
DROP POLICY IF EXISTS "Allow anon insert" ON public.logo_generations;
DROP POLICY IF EXISTS "Users can view their own logo generations" ON public.logo_generations;
DROP POLICY IF EXISTS "Users can insert their own logo generations" ON public.logo_generations;
DROP POLICY IF EXISTS "Users can update their own logo generations" ON public.logo_generations;
DROP POLICY IF EXISTS "Users can delete their own logo generations" ON public.logo_generations;
DROP POLICY IF EXISTS "Service role full access" ON public.logo_generations;

CREATE POLICY "Users can view their own logo generations"
ON public.logo_generations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logo generations"
ON public.logo_generations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logo generations"
ON public.logo_generations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logo generations"
ON public.logo_generations
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
ON public.logo_generations
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

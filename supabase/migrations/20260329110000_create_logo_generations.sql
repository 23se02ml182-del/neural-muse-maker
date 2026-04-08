-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logo_generations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Request inputs
  business_name   TEXT        NOT NULL CHECK (char_length(trim(business_name)) > 0),
  tagline         TEXT,
  industry        TEXT        NOT NULL,
  style           TEXT        NOT NULL,
  colors          TEXT[],
  mood            TEXT,
  additional_instructions TEXT,

  -- AI prompt & result
  prompt_used     TEXT        NOT NULL,
  image_url       TEXT,
  provider        TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message   TEXT,

  -- Analytics
  generation_ms   INTEGER,
  was_downloaded  BOOLEAN     NOT NULL DEFAULT FALSE,
  was_regenerated BOOLEAN     NOT NULL DEFAULT FALSE,
  user_rating     SMALLINT    CHECK (user_rating BETWEEN 1 AND 5),

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_logo_generations_user_id    ON public.logo_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_logo_generations_status     ON public.logo_generations(status);
CREATE INDEX IF NOT EXISTS idx_logo_generations_style      ON public.logo_generations(style);
CREATE INDEX IF NOT EXISTS idx_logo_generations_industry   ON public.logo_generations(industry);
CREATE INDEX IF NOT EXISTS idx_logo_generations_created_at ON public.logo_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logo_generations_user_recent ON public.logo_generations(user_id, created_at DESC);

-- ─── AUTO-UPDATE updated_at TRIGGER ─────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_logo_generations_updated_at ON public.logo_generations;
CREATE TRIGGER trg_logo_generations_updated_at
  BEFORE UPDATE ON public.logo_generations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE public.logo_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logo generations"
  ON public.logo_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logo generations"
  ON public.logo_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own logo generations"
  ON public.logo_generations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logo generations"
  ON public.logo_generations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.logo_generations FOR ALL
  USING (auth.role() = 'service_role');

-- ─── ANALYTICS VIEW ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.logo_generation_stats AS
SELECT
  date_trunc('day', created_at)                          AS day,
  style, industry, provider,
  COUNT(*)                                               AS total_generations,
  COUNT(*) FILTER (WHERE status = 'completed')           AS successful,
  COUNT(*) FILTER (WHERE status = 'failed')              AS failed,
  ROUND(AVG(generation_ms)::NUMERIC, 0)                  AS avg_ms,
  ROUND(AVG(user_rating)::NUMERIC, 2)                    AS avg_rating,
  COUNT(*) FILTER (WHERE was_downloaded)                 AS downloads
FROM public.logo_generations
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC, 5 DESC;

-- ─── STALE ROW CLEANUP ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_stale_logo_generations()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.logo_generations
  WHERE status = 'pending' AND created_at < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ─── COMMENTS ───────────────────────────────────────────────
COMMENT ON TABLE  public.logo_generations IS 'Tracks every AI logo generation request and result';
COMMENT ON COLUMN public.logo_generations.prompt_used   IS 'Exact prompt sent to the AI model';
COMMENT ON COLUMN public.logo_generations.provider      IS 'Which AI provider fulfilled the request';
COMMENT ON COLUMN public.logo_generations.generation_ms IS 'Wall-clock ms for the generation';
COMMENT ON COLUMN public.logo_generations.user_rating   IS '1–5 star rating from user';

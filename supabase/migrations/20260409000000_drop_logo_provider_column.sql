-- Remove the provider column from stored logo generation history.
-- The app still performs provider routing internally, but it is no longer persisted.

ALTER TABLE public.logo_generations
  DROP COLUMN IF EXISTS provider;

DROP VIEW IF EXISTS public.logo_generation_stats;

CREATE VIEW public.logo_generation_stats AS
SELECT
  date_trunc('day', created_at)                          AS day,
  style, industry,
  COUNT(*)                                               AS total_generations,
  COUNT(*) FILTER (WHERE status = 'completed')           AS successful,
  COUNT(*) FILTER (WHERE status = 'failed')              AS failed,
  ROUND(AVG(generation_ms)::NUMERIC, 0)                  AS avg_ms,
  ROUND(AVG(user_rating)::NUMERIC, 2)                    AS avg_rating,
  COUNT(*) FILTER (WHERE was_downloaded)                 AS downloads
FROM public.logo_generations
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

COMMENT ON TABLE  public.logo_generations IS 'Tracks every AI logo generation request and result';
COMMENT ON COLUMN public.logo_generations.prompt_used   IS 'Exact prompt sent to the AI model';
COMMENT ON COLUMN public.logo_generations.generation_ms IS 'Wall-clock ms for the generation';
COMMENT ON COLUMN public.logo_generations.user_rating   IS '1–5 star rating from user';

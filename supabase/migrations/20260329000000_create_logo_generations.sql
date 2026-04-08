-- Create the logo_generations table to track AI usage and quality
CREATE TABLE IF NOT EXISTS public.logo_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    style TEXT,
    model_used TEXT,
    prompt_used TEXT,
    generation_ms INTEGER,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) if needed, otherwise allow public for now
ALTER TABLE public.logo_generations ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Allow service role all" ON public.logo_generations
    FOR ALL USING (auth.role() = 'service_role');

-- Allow anon to insert for logging purposes (if you want public logs)
CREATE POLICY "Allow anon insert" ON public.logo_generations
    FOR INSERT WITH CHECK (true);

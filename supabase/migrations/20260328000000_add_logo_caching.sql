-- 1. Cache Table: Cut costs by 30% by reusing identical API prompts
CREATE TABLE IF NOT EXISTS public.logo_cache (
  hash TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  b64_json TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Generation Logs: Prevent runaway billing / enforce daily budget
CREATE TABLE IF NOT EXISTS public.generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_ip TEXT,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Setup Indexes for Speed
CREATE INDEX IF NOT EXISTS idx_logo_cache_hash ON public.logo_cache(hash);
CREATE INDEX IF NOT EXISTS idx_generation_logs_ip_created ON public.generation_logs(user_ip, created_at);

-- 4. Secure the tables (Only Accessible by Edge Functions via Service Role)
ALTER TABLE public.logo_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

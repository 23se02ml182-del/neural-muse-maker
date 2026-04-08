CREATE TABLE public.saved_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  panel TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ideas" ON public.saved_ideas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ideas" ON public.saved_ideas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ideas" ON public.saved_ideas FOR DELETE TO authenticated USING (auth.uid() = user_id);
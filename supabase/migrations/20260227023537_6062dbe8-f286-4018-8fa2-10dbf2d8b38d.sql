
-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey responses table
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ratings JSONB NOT NULL DEFAULT '{}',
  suggestion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Events: anyone can read active events, authenticated can manage
CREATE POLICY "Anyone can view active events" ON public.events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage events" ON public.events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Survey responses: anyone can insert (public survey), authenticated can read all
CREATE POLICY "Anyone can submit survey responses" ON public.survey_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view responses" ON public.survey_responses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete responses" ON public.survey_responses
  FOR DELETE TO authenticated USING (true);

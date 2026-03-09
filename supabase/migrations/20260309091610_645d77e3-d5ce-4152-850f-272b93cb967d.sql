
-- Coding problems table
CREATE TABLE public.coding_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test cases table
CREATE TABLE public.test_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Code submissions table
CREATE TABLE public.code_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  passed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  result_details JSONB DEFAULT '[]'::jsonb,
  score INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for coding_problems
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active problems" ON public.coding_problems FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage problems" ON public.coding_problems FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS for test_cases
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view visible test cases" ON public.test_cases FOR SELECT TO authenticated USING (is_hidden = false);
CREATE POLICY "Admins can manage test cases" ON public.test_cases FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS for code_submissions
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create own submissions" ON public.code_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own submissions" ON public.code_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all submissions" ON public.code_submissions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

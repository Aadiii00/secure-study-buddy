-- Create coding_sessions table
CREATE TABLE public.coding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES public.coding_problems(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.coding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coding sessions" ON public.coding_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own coding sessions" ON public.coding_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coding sessions" ON public.coding_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all coding sessions" ON public.coding_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update violations table
ALTER TABLE public.violations
  ADD COLUMN coding_session_id UUID REFERENCES public.coding_sessions(id) ON DELETE CASCADE,
  ALTER COLUMN attempt_id DROP NOT NULL;

-- Drop old violation policies and recreate them with OR condition
DROP POLICY IF EXISTS "Users can view own violations" ON public.violations;
DROP POLICY IF EXISTS "Users can insert violations for own attempts" ON public.violations;

CREATE POLICY "Users can view own violations" ON public.violations
  FOR SELECT TO authenticated USING (
    (attempt_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid()))
    OR
    (coding_session_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.coding_sessions WHERE id = coding_session_id AND user_id = auth.uid()))
  );

CREATE POLICY "Users can insert violations for own attempts" ON public.violations
  FOR INSERT TO authenticated WITH CHECK (
    (attempt_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid()))
    OR
    (coding_session_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.coding_sessions WHERE id = coding_session_id AND user_id = auth.uid()))
  );

-- Update proctoring_snapshots
ALTER TABLE public.proctoring_snapshots
  ADD COLUMN coding_session_id UUID REFERENCES public.coding_sessions(id) ON DELETE CASCADE,
  ALTER COLUMN attempt_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users can insert snapshots for own attempts" ON public.proctoring_snapshots;

CREATE POLICY "Users can insert snapshots for own attempts" ON public.proctoring_snapshots
  FOR INSERT TO authenticated WITH CHECK (
    (attempt_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid()))
    OR
    (coding_session_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.coding_sessions WHERE id = coding_session_id AND user_id = auth.uid()))
  );

-- Function to handle Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE coding_sessions;

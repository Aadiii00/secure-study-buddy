-- Add recording_url to exam_attempts
ALTER TABLE public.exam_attempts 
ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Create exam-recordings storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exam-recordings', 'exam-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Allow authenticated users to upload their own recordings
CREATE POLICY "Students can upload exam recordings" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'exam-recordings' AND 
  (EXISTS (
    SELECT 1 FROM public.exam_attempts 
    WHERE id::text = (string_to_array(name, '/'))[1] 
    AND user_id = auth.uid()
  ))
);

-- Allow users to view their own recordings
CREATE POLICY "Students can view own exam recordings" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'exam-recordings' AND 
  (EXISTS (
    SELECT 1 FROM public.exam_attempts 
    WHERE id::text = (string_to_array(name, '/'))[1] 
    AND user_id = auth.uid()
  ))
);

-- Allow admins to view all recordings
CREATE POLICY "Admins can view all exam recordings" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'exam-recordings' AND 
  public.has_role(auth.uid(), 'admin')
);

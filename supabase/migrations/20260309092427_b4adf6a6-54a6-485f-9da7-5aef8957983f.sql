
-- Allow admins to delete submissions and test cases (needed for problem deletion)
CREATE POLICY "Admins can delete submissions" ON public.code_submissions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete test cases" ON public.test_cases FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete problems" ON public.coding_problems FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

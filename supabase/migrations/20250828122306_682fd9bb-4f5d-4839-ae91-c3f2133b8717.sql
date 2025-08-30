-- Fix RLS policy for employees to view all candidates
-- Drop the restrictive policy for employees
DROP POLICY IF EXISTS "Employees can view assigned candidates" ON public.candidates;

-- Create new policy allowing employees to view all candidates
CREATE POLICY "Employees can view all candidates" ON public.candidates
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('medewerker', 'manager', 'hr_manager')
    )
  );
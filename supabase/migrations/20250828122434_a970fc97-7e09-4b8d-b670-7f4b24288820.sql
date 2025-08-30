-- Fix RLS policies for interviews to allow all employees to view all interviews
-- Drop the restrictive view policies
DROP POLICY IF EXISTS "HR and managers can view all interviews" ON public.interviews;
DROP POLICY IF EXISTS "Interviewers can view their own interviews" ON public.interviews;

-- Create new policy allowing all employees to view all interviews
CREATE POLICY "All employees can view all interviews" ON public.interviews
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('medewerker', 'manager', 'hr_manager')
    )
  );
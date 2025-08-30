-- Fix RLS policies for interviews to allow all employees to view all interviews
-- Drop the restrictive policies
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

-- Keep the interviewer policy for updating their own interviews
CREATE POLICY "Interviewers can update their own interviews" ON public.interviews
  FOR UPDATE 
  USING (
    interviewer_id = (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  );
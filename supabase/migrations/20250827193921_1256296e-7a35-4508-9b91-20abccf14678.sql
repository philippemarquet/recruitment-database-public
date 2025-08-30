-- Fix security issue: Restrict candidate data access to authorized personnel only

-- Drop the overly permissive policy that allows all recruiters to view all candidates
DROP POLICY IF EXISTS "Recruiters and HR can view candidates" ON public.candidates;

-- Create more restrictive policies

-- 1. HR Managers and Managers can view all candidates (they need full oversight)
CREATE POLICY "HR and Managers can view all candidates" ON public.candidates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('hr_manager', 'manager')
  )
);

-- 2. Regular employees can only view candidates assigned to them
CREATE POLICY "Employees can view assigned candidates" ON public.candidates
FOR SELECT USING (
  assigned_to = (
    SELECT id FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'medewerker'
  )
);

-- 3. External recruiters can only view candidates from their own source
CREATE POLICY "External recruiters can view own sourced candidates" ON public.candidates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'externe_recruiter'
    AND p.recruiter_source IS NOT NULL
    AND p.recruiter_source = candidates.source
  )
);

-- Keep existing update/insert/delete policies as they are already appropriately restrictive
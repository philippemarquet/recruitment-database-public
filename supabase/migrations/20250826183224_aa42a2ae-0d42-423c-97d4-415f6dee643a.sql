-- Fix critical security issue: Restrict candidate data access to recruiters and HR staff only
-- Drop the current policy that allows all authenticated users to view all candidates
DROP POLICY IF EXISTS "Authenticated users can view all candidates" ON public.candidates;

-- Create new restrictive policy: Only recruiters and HR staff can view candidate data
CREATE POLICY "Recruiters and HR can view candidates" 
ON public.candidates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('manager', 'hr_manager', 'medewerker', 'externe_recruiter')
  )
);

-- Also restrict other operations to appropriate roles
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can create candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can update candidates" ON public.candidates; 
DROP POLICY IF EXISTS "Authenticated users can delete candidates" ON public.candidates;

-- Create role-based policies for candidate operations
CREATE POLICY "Recruiters can create candidates" 
ON public.candidates 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('manager', 'hr_manager', 'medewerker', 'externe_recruiter')
  )
);

CREATE POLICY "Recruiters can update candidates" 
ON public.candidates 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('manager', 'hr_manager', 'medewerker', 'externe_recruiter')
  )
);

CREATE POLICY "Managers can delete candidates" 
ON public.candidates 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('manager', 'hr_manager')
  )
);
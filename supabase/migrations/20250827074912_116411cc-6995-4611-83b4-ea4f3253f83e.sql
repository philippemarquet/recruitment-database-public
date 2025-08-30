-- Fix critical security issue: Restrict interview access to authorized users only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view interviews" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users can create interviews" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users can update interviews" ON public.interviews;

-- Create secure, role-based policies for interview access
-- Only HR managers and managers can view all interviews
CREATE POLICY "HR and managers can view all interviews" 
ON public.interviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('hr_manager', 'manager')
  )
);

-- Interviewers can view their own interviews
CREATE POLICY "Interviewers can view their own interviews" 
ON public.interviews 
FOR SELECT 
USING (
  interviewer_id = (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Only HR managers and managers can create interviews
CREATE POLICY "HR and managers can create interviews" 
ON public.interviews 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('hr_manager', 'manager')
  )
);

-- HR and managers can update all interviews
CREATE POLICY "HR and managers can update all interviews" 
ON public.interviews 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('hr_manager', 'manager')
  )
);

-- Interviewers can update their own interviews (for notes submission)
CREATE POLICY "Interviewers can update their own interviews" 
ON public.interviews 
FOR UPDATE 
USING (
  interviewer_id = (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);
-- Fix critical security issue: Replace overly permissive profile SELECT policy
-- Drop the current policy that allows all users to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new restrictive policy: Users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create separate policy for managers to view employee profiles for business purposes
CREATE POLICY "Managers can view employee profiles" 
ON public.profiles 
FOR SELECT 
USING (
  is_manager(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('hr_manager')
  )
);
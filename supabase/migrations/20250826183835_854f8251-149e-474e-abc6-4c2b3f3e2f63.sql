-- Fix infinite recursion in profiles RLS policies
-- The issue is that the "Managers can view employee profiles" policy 
-- has a direct EXISTS query on profiles table, causing recursion

-- First, create a security definer function to check HR manager role
CREATE OR REPLACE FUNCTION public.is_hr_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.role = 'hr_manager'
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Managers can view employee profiles" ON public.profiles;

-- Create a new policy that only uses security definer functions
CREATE POLICY "Managers can view employee profiles" 
ON public.profiles 
FOR SELECT 
USING (
  public.is_manager(auth.uid()) OR public.is_hr_manager(auth.uid())
);
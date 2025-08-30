-- Add HR manager role 

-- First check if we have any managers and convert one to hr_manager
UPDATE profiles 
SET role = 'hr_manager' 
WHERE id = (
  SELECT id 
  FROM profiles 
  WHERE role = 'manager' 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- If no manager was found, let's check what roles we have
-- and ensure we can create screening actions for the hr_manager role

-- Update the is_manager function to include hr_manager
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.role IN ('manager', 'hr_manager')
  );
$$;

-- Create function to get HR manager
CREATE OR REPLACE FUNCTION public.get_hr_manager()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.profiles 
  WHERE role = 'hr_manager' 
  ORDER BY created_at ASC 
  LIMIT 1;
$$;
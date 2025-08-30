-- Drop the existing policy that allows all employees to view all candidates
DROP POLICY IF EXISTS "Employees can view all candidates" ON public.candidates;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Managers and HR can view all candidates" ON public.candidates;
DROP POLICY IF EXISTS "Medewerkers can view assigned candidates" ON public.candidates;

-- Create new policy for managers and HR managers to view all candidates
CREATE POLICY "Managers and HR can view all candidates" 
ON public.candidates 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY (ARRAY['manager'::text, 'hr_manager'::text])
));

-- Create new policy for medewerkers to only view assigned candidates
CREATE POLICY "Medewerkers can view assigned candidates" 
ON public.candidates 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() 
  AND p.role = 'medewerker'::text
  AND p.id = candidates.assigned_to
));
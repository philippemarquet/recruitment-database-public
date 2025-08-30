-- Adjust RLS policies so external recruiters cannot update candidates and can only insert with their own source

-- Drop existing broad INSERT/UPDATE policies to replace with stricter ones
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidates' AND policyname = 'Recruiters can create candidates'
  ) THEN
    DROP POLICY "Recruiters can create candidates" ON public.candidates;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidates' AND policyname = 'Recruiters can update candidates'
  ) THEN
    DROP POLICY "Recruiters can update candidates" ON public.candidates;
  END IF;
END $$;

-- Create INSERT policy for staff (manager/hr_manager/medewerker)
CREATE POLICY "Staff can create candidates"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = ANY (ARRAY['manager','hr_manager','medewerker'])
  )
);

-- Create INSERT policy strictly for external recruiters, only with their own source
CREATE POLICY "External recruiters can create with own source"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'externe_recruiter'
      AND p.recruiter_source IS NOT NULL
      AND p.recruiter_source = candidates.source
  )
);

-- Create UPDATE policy for staff only (exclude external recruiters)
CREATE POLICY "Staff can update candidates"
ON public.candidates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = ANY (ARRAY['manager','hr_manager','medewerker'])
  )
);

-- Ensure table has RLS enabled (no-op if already enabled)
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Add trigger to automatically assign HR manager on candidate inserts when not provided
CREATE OR REPLACE FUNCTION public.set_hr_manager_on_candidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hr uuid;
BEGIN
  SELECT public.get_hr_manager() INTO v_hr;
  IF v_hr IS NOT NULL THEN
    -- Always assign to HR manager if not already assigned
    IF NEW.assigned_to IS NULL THEN
      NEW.assigned_to := v_hr;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_hr_manager_on_candidate ON public.candidates;
CREATE TRIGGER trg_set_hr_manager_on_candidate
BEFORE INSERT ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.set_hr_manager_on_candidate();
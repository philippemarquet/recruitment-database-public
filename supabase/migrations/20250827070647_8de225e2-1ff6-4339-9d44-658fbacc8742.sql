-- Fix the last security warning for set_hr_manager_on_candidate function
CREATE OR REPLACE FUNCTION public.set_hr_manager_on_candidate()
RETURNS TRIGGER AS $$
DECLARE
  v_hr UUID;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
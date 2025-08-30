-- Zorg ervoor dat kandidaten in onderhandelingsfase altijd toegewezen zijn aan HR manager
CREATE OR REPLACE FUNCTION public.ensure_hr_assignment_on_negotiation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_hr_manager_id UUID;
BEGIN
  -- Als de fase verandert naar negotiation, zorg dat HR manager toegewezen is
  IF NEW.current_phase = 'negotiation' AND (OLD.current_phase IS NULL OR OLD.current_phase != 'negotiation') THEN
    -- Haal HR manager op
    SELECT public.get_hr_manager() INTO v_hr_manager_id;
    
    -- Als er een HR manager is, wijs altijd toe aan HR manager (overschrijf bestaande toewijzing)
    IF v_hr_manager_id IS NOT NULL THEN
      NEW.assigned_to := v_hr_manager_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Maak een trigger die zorgt dat kandidaten in onderhandelingsfase altijd aan HR manager toegewezen zijn
DROP TRIGGER IF EXISTS ensure_hr_assignment_on_negotiation_trigger ON public.candidates;
CREATE TRIGGER ensure_hr_assignment_on_negotiation_trigger
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_hr_assignment_on_negotiation();
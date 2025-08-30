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
    
    -- Als er een HR manager is en de kandidaat niet is toegewezen, wijs toe aan HR manager
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

-- Voeg een unieke constraint toe zodat er maar één HR manager kan zijn
-- Eerst alle bestaande HR managers behalve de eerste verwijderen/downgraden
UPDATE public.profiles 
SET role = 'manager' 
WHERE role = 'hr_manager' 
AND id NOT IN (
  SELECT id 
  FROM public.profiles 
  WHERE role = 'hr_manager' 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Voeg unieke constraint toe voor HR manager rol
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_single_hr_manager 
ON public.profiles (role) 
WHERE role = 'hr_manager';

-- Voeg een constraint functie toe die rol wijzigingen valideert
CREATE OR REPLACE FUNCTION public.validate_single_hr_manager()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Als iemand probeert HR manager te worden, check of er al een is
  IF NEW.role = 'hr_manager' AND (OLD.role IS NULL OR OLD.role != 'hr_manager') THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'hr_manager' AND id != NEW.id) THEN
      RAISE EXCEPTION 'Er kan maar één HR manager zijn. Maak eerst de huidige HR manager een gewone manager.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Maak trigger voor HR manager validatie
DROP TRIGGER IF EXISTS validate_single_hr_manager_trigger ON public.profiles;
CREATE TRIGGER validate_single_hr_manager_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_single_hr_manager();
-- Eerst alle bestaande HR managers behalve de eerste downgraden naar manager
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
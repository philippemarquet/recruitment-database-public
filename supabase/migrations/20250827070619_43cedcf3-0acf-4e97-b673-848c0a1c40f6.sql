-- Fix security warnings by adding search_path to functions
CREATE OR REPLACE FUNCTION public.get_hr_manager()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles 
  WHERE role = 'hr_manager' 
  ORDER BY created_at ASC 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.reassign_to_hr_after_notes()
RETURNS TRIGGER AS $$
DECLARE
    hr_manager_id UUID;
BEGIN
    -- Only proceed if notes were submitted (notes_submitted_at was updated)
    IF NEW.notes_submitted_at IS NOT NULL AND OLD.notes_submitted_at IS NULL THEN
        -- Get the HR manager
        SELECT get_hr_manager() INTO hr_manager_id;
        
        -- Update the candidate's assignment to HR manager
        UPDATE public.candidates 
        SET assigned_to = hr_manager_id,
            updated_at = now()
        WHERE id = NEW.candidate_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
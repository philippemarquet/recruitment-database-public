-- Update the trigger to reassign candidate to HR manager when interview notes are submitted
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for reassigning candidate to HR manager after notes submission
DROP TRIGGER IF EXISTS trg_reassign_to_hr_after_notes ON public.interviews;
CREATE TRIGGER trg_reassign_to_hr_after_notes
    AFTER UPDATE ON public.interviews
    FOR EACH ROW
    EXECUTE FUNCTION public.reassign_to_hr_after_notes();
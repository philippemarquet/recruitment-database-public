-- Create trigger function to create action when candidate reaches negotiation phase
CREATE OR REPLACE FUNCTION public.create_negotiation_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hr uuid;
BEGIN
  -- Only proceed if the phase changed TO 'negotiation'
  IF NEW.current_phase = 'negotiation' AND (OLD.current_phase IS NULL OR OLD.current_phase != 'negotiation') THEN
    -- Get HR manager
    SELECT public.get_hr_manager() INTO v_hr;
    
    IF v_hr IS NOT NULL THEN
      -- Check if there's already an open negotiation_result action for this candidate
      IF NOT EXISTS (
        SELECT 1
        FROM public.candidate_actions a
        WHERE a.candidate_id = NEW.id
          AND a.action_type = 'negotiation_result'
          AND a.completed = false
      ) THEN
        -- Create negotiation result action for HR manager
        INSERT INTO public.candidate_actions (
          candidate_id, assigned_to, action_type, phase, due_date
        ) VALUES (
          NEW.id, v_hr, 'negotiation_result', 'negotiation', now() + interval '7 days'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on candidates table
DROP TRIGGER IF EXISTS create_negotiation_action_trigger ON public.candidates;
CREATE TRIGGER create_negotiation_action_trigger
  AFTER UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.create_negotiation_action();
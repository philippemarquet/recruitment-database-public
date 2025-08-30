-- Fix security warnings by setting proper search paths for functions

-- Fix the update_candidate_phase_date function
CREATE OR REPLACE FUNCTION public.update_candidate_phase_date()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the appropriate date field based on the new phase
  CASE NEW.current_phase
    WHEN 'screening' THEN 
      NEW.screening_date = COALESCE(NEW.screening_date, now());
    WHEN 'first_interview' THEN 
      NEW.first_interview_date = COALESCE(NEW.first_interview_date, now());
    WHEN 'second_interview' THEN 
      NEW.second_interview_date = COALESCE(NEW.second_interview_date, now());
    WHEN 'third_interview' THEN 
      NEW.third_interview_date = COALESCE(NEW.third_interview_date, now());
    WHEN 'negotiation' THEN 
      NEW.offer_date = COALESCE(NEW.offer_date, now());
    WHEN 'rejected' THEN 
      NEW.final_decision_date = COALESCE(NEW.final_decision_date, now());
    ELSE 
      -- Do nothing for other phases
  END CASE;
  
  RETURN NEW;
END;
$$;
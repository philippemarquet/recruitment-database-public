-- Fix Function Search Path Mutable warnings by adding SET search_path = public
-- Update all existing functions to include proper search_path

-- Fix ensure_hr_assignment_on_negotiation function
CREATE OR REPLACE FUNCTION public.ensure_hr_assignment_on_negotiation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email, role)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    'medewerker'
  );
  RETURN NEW;
END;
$function$;

-- Fix validate_single_hr_manager function
CREATE OR REPLACE FUNCTION public.validate_single_hr_manager()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Als iemand probeert HR manager te worden, check of er al een is
  IF NEW.role = 'hr_manager' AND (OLD.role IS NULL OR OLD.role != 'hr_manager') THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'hr_manager' AND id != NEW.id) THEN
      RAISE EXCEPTION 'Er kan maar één HR manager zijn. Maak eerst de huidige HR manager een gewone manager.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_candidate_phase_date function
CREATE OR REPLACE FUNCTION public.update_candidate_phase_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Fix is_manager function
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.role IN ('manager', 'hr_manager')
  );
$function$;

-- Fix get_hr_manager function
CREATE OR REPLACE FUNCTION public.get_hr_manager()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT id FROM public.profiles 
  WHERE role = 'hr_manager' 
  ORDER BY created_at ASC 
  LIMIT 1;
$function$;

-- Fix is_hr_manager function
CREATE OR REPLACE FUNCTION public.is_hr_manager(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.role = 'hr_manager'
  );
$function$;

-- Fix create_phase_decision_action_on_interview_complete function
CREATE OR REPLACE FUNCTION public.create_phase_decision_action_on_interview_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare
  v_hr uuid;
begin
  -- Bepaal HR manager (veilig via security definer)
  select public.get_hr_manager() into v_hr;

  if v_hr is null then
    -- Geen HR manager gevonden => doe niets
    return new;
  end if;

  -- Voorwaarde: interview is afgerond en er staan notities
  if new.status = 'completed'
     and coalesce(trim(new.interview_notes), '') <> '' then
     
     -- Check: bestaat er al een openstaande phase_decision-actie voor deze kandidaat+fase?
     if not exists (
       select 1
       from public.candidate_actions a
       where a.candidate_id = new.candidate_id
         and a.phase = new.phase
         and a.action_type = 'phase_decision'
         and a.completed = false
     ) then
       insert into public.candidate_actions (
         candidate_id, assigned_to, action_type, phase, due_date
       ) values (
         new.candidate_id, v_hr, 'phase_decision', new.phase, now() + interval '3 days'
       );
     end if;
  end if;

  return new;
end;
$function$;

-- Fix create_negotiation_action function
CREATE OR REPLACE FUNCTION public.create_negotiation_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Fix set_hr_manager_on_candidate function
CREATE OR REPLACE FUNCTION public.set_hr_manager_on_candidate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Fix reassign_to_hr_after_notes function
CREATE OR REPLACE FUNCTION public.reassign_to_hr_after_notes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Fix get_public_profiles function
CREATE OR REPLACE FUNCTION public.get_public_profiles(ids uuid[])
 RETURNS TABLE(id uuid, first_name text, last_name text, avatar_url text, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  select p.id, p.first_name, p.last_name, p.avatar_url, p.role
  from public.profiles p
  where p.id = any (ids)
$function$;

-- Add security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  user_id uuid,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Log security events for audit purposes
  INSERT INTO public.security_logs (event_type, user_id, details, created_at)
  VALUES (event_type, user_id, details, now());
EXCEPTION 
  WHEN others THEN
    -- Fail silently to not disrupt application flow
    NULL;
END;
$function$;

-- Create security logs table for audit trail
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only managers can view security logs
CREATE POLICY "Managers can view security logs" ON public.security_logs
  FOR SELECT USING (is_manager(auth.uid()));

-- System can insert security logs
CREATE POLICY "System can insert security logs" ON public.security_logs
  FOR INSERT WITH CHECK (true);
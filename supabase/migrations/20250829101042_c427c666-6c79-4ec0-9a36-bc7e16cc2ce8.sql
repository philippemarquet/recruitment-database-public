-- Disable email triggers by removing the email trigger calls from database functions
-- Remove email processing from candidate creation trigger
CREATE OR REPLACE FUNCTION public.trigger_candidate_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Email functionality removed
  RETURN NEW;
END;
$function$;

-- Remove email processing from phase change trigger
CREATE OR REPLACE FUNCTION public.trigger_phase_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Email functionality removed
  RETURN NEW;
END;
$function$;

-- Remove email processing from candidate assignment trigger
CREATE OR REPLACE FUNCTION public.trigger_candidate_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Email functionality removed
  RETURN NEW;
END;
$function$;

-- Remove email processing function entirely
DROP FUNCTION IF EXISTS public.process_email_triggers(text, uuid, jsonb);

-- Remove email trigger processing function
DROP FUNCTION IF EXISTS public.trigger_email_processing();
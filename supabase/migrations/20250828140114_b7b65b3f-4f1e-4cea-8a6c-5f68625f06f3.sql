-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_candidate_assigned ON candidates;
DROP TRIGGER IF EXISTS on_candidate_phase_changed ON candidates;
DROP TRIGGER IF EXISTS on_candidate_created ON candidates;
DROP TRIGGER IF EXISTS on_interview_completed ON interviews;

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS public.trigger_candidate_assigned();
DROP FUNCTION IF EXISTS public.trigger_phase_changed();
DROP FUNCTION IF EXISTS public.trigger_candidate_created();
DROP FUNCTION IF EXISTS public.trigger_interview_completed();

-- Create function to process email triggers
CREATE OR REPLACE FUNCTION public.process_email_triggers(
  p_trigger_event text,
  p_candidate_id uuid,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trigger_record record;
  log_id uuid;
BEGIN
  -- Loop through active triggers for this event
  FOR trigger_record IN 
    SELECT et.*, emt.name as template_name, emt.subject, emt.body_html, emt.body_text
    FROM email_triggers et
    LEFT JOIN email_templates emt ON et.template_id = emt.id
    WHERE et.trigger_event = p_trigger_event 
    AND et.is_active = true
  LOOP
    -- Check if trigger conditions are met (if any)
    IF trigger_record.trigger_conditions IS NOT NULL 
       AND jsonb_typeof(trigger_record.trigger_conditions) = 'object'
       AND trigger_record.trigger_conditions != '{}'::jsonb THEN
      -- Simple condition checking (can be expanded)
      CONTINUE WHEN NOT (p_data @> trigger_record.trigger_conditions);
    END IF;
    
    -- Create email log entry
    INSERT INTO email_logs (
      candidate_id,
      template_id,
      trigger_id,
      recipient_email,
      recipient_name,
      subject,
      status
    )
    SELECT 
      p_candidate_id,
      trigger_record.template_id,
      trigger_record.id,
      c.email,
      c.first_name || ' ' || c.last_name,
      COALESCE(trigger_record.subject, 'Email van recruitment systeem'),
      'pending'
    FROM candidates c
    WHERE c.id = p_candidate_id
    RETURNING id INTO log_id;
    
    -- Schedule email sending via edge function (we'll handle this in the send-email function)
    -- For now, just log that an email should be sent
    
  END LOOP;
END;
$$;

-- Trigger function for candidate assignment
CREATE OR REPLACE FUNCTION public.trigger_candidate_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when assigned_to changes and is not null
  IF (OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL) OR 
     (OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NOT NULL AND OLD.assigned_to != NEW.assigned_to) THEN
    
    PERFORM public.process_email_triggers(
      'candidate_assigned',
      NEW.id,
      jsonb_build_object(
        'phase', NEW.current_phase,
        'source', NEW.source,
        'position', NEW.position_applied
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for phase changes  
CREATE OR REPLACE FUNCTION public.trigger_phase_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when phase actually changes
  IF OLD.current_phase != NEW.current_phase THEN
    PERFORM public.process_email_triggers(
      'phase_changed',
      NEW.id,
      jsonb_build_object(
        'old_phase', OLD.current_phase,
        'new_phase', NEW.current_phase,
        'source', NEW.source,
        'position', NEW.position_applied
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for new candidates
CREATE OR REPLACE FUNCTION public.trigger_candidate_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.process_email_triggers(
    'candidate_created',
    NEW.id,
    jsonb_build_object(
      'phase', NEW.current_phase,
      'source', NEW.source,
      'position', NEW.position_applied
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create the actual triggers
CREATE TRIGGER on_candidate_assigned_email
  AFTER UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_candidate_assigned();

CREATE TRIGGER on_candidate_phase_changed_email
  AFTER UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_phase_changed();

CREATE TRIGGER on_candidate_created_email
  AFTER INSERT ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_candidate_created();
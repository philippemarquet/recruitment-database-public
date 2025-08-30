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
    
    -- Call edge function to send email (async)
    PERFORM net.http_post(
      url := 'https://pvlowtgvkkpwepvzhaox.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'logId', log_id,
        'delayHours', trigger_record.delay_hours
      )
    );
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
CREATE TRIGGER on_candidate_assigned
  AFTER UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_candidate_assigned();

CREATE TRIGGER on_candidate_phase_changed
  AFTER UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_phase_changed();

CREATE TRIGGER on_candidate_created
  AFTER INSERT ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_candidate_created();

-- Trigger for interview completion
CREATE OR REPLACE FUNCTION public.trigger_interview_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM public.process_email_triggers(
      'interview_completed',
      NEW.candidate_id,
      jsonb_build_object(
        'phase', NEW.phase,
        'interview_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_interview_completed
  AFTER UPDATE ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_interview_completed();
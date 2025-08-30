-- Fix process_email_triggers to handle recipient types correctly
CREATE OR REPLACE FUNCTION public.process_email_triggers(p_trigger_event text, p_candidate_id uuid, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trigger_record record;
  log_id uuid;
  recipient_email text;
  recipient_name text;
  action_data record;
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
      CONTINUE WHEN NOT (p_data @> trigger_record.trigger_conditions);
    END IF;

    -- Determine recipient based on recipient_type
    recipient_email := null;
    recipient_name := null;
    
    CASE trigger_record.recipient_type
      WHEN 'candidate' THEN
        SELECT c.email, c.first_name || ' ' || c.last_name
        INTO recipient_email, recipient_name
        FROM candidates c
        WHERE c.id = p_candidate_id;
        
      WHEN 'action_owner' THEN
        -- Get the most recent action assignee for this candidate
        SELECT p.email, p.first_name || ' ' || p.last_name
        INTO recipient_email, recipient_name
        FROM candidate_actions ca
        JOIN profiles p ON ca.assigned_to = p.id
        WHERE ca.candidate_id = p_candidate_id
        ORDER BY ca.created_at DESC
        LIMIT 1;
        
      WHEN 'hr_manager' THEN
        SELECT p.email, p.first_name || ' ' || p.last_name
        INTO recipient_email, recipient_name
        FROM profiles p
        WHERE p.role = 'hr_manager'
        LIMIT 1;
        
      WHEN 'recruiter' THEN
        -- Get recruiter based on candidate source
        SELECT p.email, p.first_name || ' ' || p.last_name
        INTO recipient_email, recipient_name
        FROM profiles p
        JOIN candidates c ON p.recruiter_source = c.source
        WHERE c.id = p_candidate_id AND p.role = 'externe_recruiter'
        LIMIT 1;
        
      WHEN 'manager' THEN
        SELECT p.email, p.first_name || ' ' || p.last_name
        INTO recipient_email, recipient_name
        FROM profiles p
        WHERE p.role = 'manager'
        LIMIT 1;
        
      ELSE
        -- Default to candidate if recipient type not recognized
        SELECT c.email, c.first_name || ' ' || c.last_name
        INTO recipient_email, recipient_name
        FROM candidates c
        WHERE c.id = p_candidate_id;
    END CASE;

    -- Skip if no recipient found
    CONTINUE WHEN recipient_email IS NULL;

    -- Create email log entry with correct recipient
    INSERT INTO email_logs (
      candidate_id,
      template_id,
      trigger_id,
      recipient_email,
      recipient_name,
      recipient_type,
      subject,
      status
    )
    VALUES (
      p_candidate_id,
      trigger_record.template_id,
      trigger_record.id,
      recipient_email,
      recipient_name,
      trigger_record.recipient_type,
      COALESCE(trigger_record.subject, trigger_record.template_name, 'Email van recruitment systeem'),
      'pending'
    )
    RETURNING id INTO log_id;

    -- Call the send-email edge function via pg_net
    BEGIN
      PERFORM net.http_post(
        url := 'https://pvlowtgvkkpwepvzhaox.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'logId', log_id,
          'delayHours', trigger_record.delay_hours
        )
      );

      -- Mark as processing after successful enqueue
      UPDATE email_logs 
      SET status = 'processing' 
      WHERE id = log_id;

    EXCEPTION WHEN others THEN
      -- Log error but don't fail the entire transaction
      UPDATE email_logs 
      SET status = 'failed', error_message = SQLERRM 
      WHERE id = log_id;
    END;
  END LOOP;
END;
$function$;
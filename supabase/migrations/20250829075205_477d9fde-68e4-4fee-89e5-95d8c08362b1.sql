-- Ensure pg_net extension is available
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update process_email_triggers to use net.http_post correctly
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
      COALESCE(trigger_record.subject, trigger_record.template_name, 'Email van recruitment systeem'),
      'pending'
    FROM candidates c
    WHERE c.id = p_candidate_id
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
$$;

-- Update trigger_email_processing to use net.http_post
CREATE OR REPLACE FUNCTION public.trigger_email_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://pvlowtgvkkpwepvzhaox.supabase.co/functions/v1/process-pending-emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  EXCEPTION WHEN others THEN
    -- Log error but don't fail
    RAISE WARNING 'Failed to trigger email processing: %', SQLERRM;
  END;
END;
$$;
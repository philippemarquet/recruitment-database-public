-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email triggers table
CREATE TABLE public.email_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL, -- 'new_action', 'deadline_reminder', 'phase_change', etc.
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  delay_hours INTEGER DEFAULT 0, -- For deadline reminders
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.email_templates(id),
  trigger_id UUID REFERENCES public.email_triggers(id),
  candidate_id UUID REFERENCES public.candidates(id),
  action_id UUID REFERENCES public.candidate_actions(id),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
  resend_id TEXT, -- Resend email ID for tracking
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "HR managers can manage email templates" 
ON public.email_templates 
FOR ALL 
USING (is_hr_manager(auth.uid()))
WITH CHECK (is_hr_manager(auth.uid()));

-- RLS Policies for email_triggers
CREATE POLICY "HR managers can manage email triggers" 
ON public.email_triggers 
FOR ALL 
USING (is_hr_manager(auth.uid()))
WITH CHECK (is_hr_manager(auth.uid()));

-- RLS Policies for email_logs
CREATE POLICY "HR managers can view email logs" 
ON public.email_logs 
FOR SELECT 
USING (is_hr_manager(auth.uid()));

CREATE POLICY "System can create email logs" 
ON public.email_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update email logs" 
ON public.email_logs 
FOR UPDATE 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_triggers_updated_at
BEFORE UPDATE ON public.email_triggers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, body_html, variables) VALUES 
(
  'Nieuwe Actie Toegewezen',
  'Nieuwe actie: {{action_type}} voor {{candidate_name}}',
  '<h2>Hallo {{assignee_name}},</h2>
  <p>Er is een nieuwe actie voor je toegewezen:</p>
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <strong>Kandidaat:</strong> {{candidate_name}}<br>
    <strong>Positie:</strong> {{position_applied}}<br>
    <strong>Actie:</strong> {{action_type}}<br>
    <strong>Fase:</strong> {{current_phase}}<br>
    <strong>Deadline:</strong> {{due_date}}
  </div>
  <p><a href="{{system_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Bekijk in systeem</a></p>
  <p>Met vriendelijke groet,<br>Het Nhanced Recruitment Team</p>',
  '["candidate_name", "assignee_name", "action_type", "position_applied", "current_phase", "due_date", "system_url"]'::jsonb
),
(
  'Deadline Herinnering',
  'Herinnering: {{action_type}} deadline nadert voor {{candidate_name}}',
  '<h2>Hallo {{assignee_name}},</h2>
  <p><strong>Let op:</strong> De deadline voor je actie nadert!</p>
  <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <strong>Kandidaat:</strong> {{candidate_name}}<br>
    <strong>Actie:</strong> {{action_type}}<br>
    <strong>Deadline:</strong> {{due_date}}<br>
    <strong>Status:</strong> {{days_remaining}} dagen resterend
  </div>
  <p><a href="{{system_url}}" style="background: #ffc107; color: #212529; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Actie uitvoeren</a></p>
  <p>Met vriendelijke groet,<br>Het Nhanced Recruitment Team</p>',
  '["candidate_name", "assignee_name", "action_type", "due_date", "days_remaining", "system_url"]'::jsonb
),
(
  'Interview Gepland',
  'Interview gepland: {{candidate_name}} - {{interview_date}}',
  '<h2>Hallo {{interviewer_name}},</h2>
  <p>Er is een interview voor je gepland:</p>
  <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
    <strong>Kandidaat:</strong> {{candidate_name}}<br>
    <strong>Positie:</strong> {{position_applied}}<br>
    <strong>Datum & Tijd:</strong> {{interview_date}}<br>
    <strong>Locatie:</strong> {{interview_location}}<br>
    <strong>Fase:</strong> {{interview_phase}}
  </div>
  <p><a href="{{system_url}}" style="background: #17a2b8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Bekijk details</a></p>
  <p>Met vriendelijke groet,<br>Het Nhanced Recruitment Team</p>',
  '["candidate_name", "interviewer_name", "position_applied", "interview_date", "interview_location", "interview_phase", "system_url"]'::jsonb
);

-- Insert default triggers
INSERT INTO public.email_triggers (template_id, trigger_event, is_active) 
SELECT id, 'new_action', true FROM public.email_templates WHERE name = 'Nieuwe Actie Toegewezen';

INSERT INTO public.email_triggers (template_id, trigger_event, delay_hours, is_active) 
SELECT id, 'deadline_reminder', 24, true FROM public.email_templates WHERE name = 'Deadline Herinnering';

INSERT INTO public.email_triggers (template_id, trigger_event, is_active) 
SELECT id, 'interview_scheduled', true FROM public.email_templates WHERE name = 'Interview Gepland';
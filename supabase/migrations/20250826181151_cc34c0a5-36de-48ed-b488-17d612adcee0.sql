-- Add HR manager profile and rejection reasons system

-- Create rejection reasons table
CREATE TABLE public.rejection_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reason TEXT NOT NULL,
  category TEXT NOT NULL, -- 'company' or 'candidate'
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;

-- Create policies for rejection reasons
CREATE POLICY "Authenticated can read rejection_reasons" 
ON public.rejection_reasons 
FOR SELECT 
USING (true);

CREATE POLICY "Managers can write rejection_reasons" 
ON public.rejection_reasons 
FOR ALL 
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Add workflow tracking fields to candidates table
ALTER TABLE public.candidates ADD COLUMN screening_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.candidates ADD COLUMN first_interview_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.candidates ADD COLUMN second_interview_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.candidates ADD COLUMN third_interview_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.candidates ADD COLUMN offer_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.candidates ADD COLUMN final_decision_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.candidates ADD COLUMN rejection_reason_id UUID REFERENCES public.rejection_reasons(id);
ALTER TABLE public.candidates ADD COLUMN rejected_by TEXT; -- 'company' or 'candidate'

-- Add new action types and workflow fields to candidate_actions
ALTER TABLE public.candidate_actions ALTER COLUMN action_type TYPE TEXT;
-- Update action_type to support new workflow actions:
-- 'screening_review', 'schedule_interview', 'submit_notes', 'phase_decision', 'make_offer', 'final_decision'

-- Insert some default rejection reasons
INSERT INTO public.rejection_reasons (reason, category) VALUES
('Onvoldoende ervaring', 'company'),
('Salariswensen te hoog', 'company'),
('Niet de juiste fit', 'company'),
('Technische vaardigheden ontoereikend', 'company'),
('Communicatieve vaardigheden ontoereikend', 'company'),
('Beter aanbod elders geaccepteerd', 'candidate'),
('Salaris te laag', 'candidate'),
('Werklocatie niet geschikt', 'candidate'),
('Functieomschrijving niet naar wens', 'candidate'),
('Persoonlijke omstandigheden', 'candidate');

-- Create function to handle candidate phase transitions with date tracking
CREATE OR REPLACE FUNCTION public.update_candidate_phase_date()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for automatic date tracking
CREATE TRIGGER update_candidate_phase_dates
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  WHEN (OLD.current_phase IS DISTINCT FROM NEW.current_phase)
  EXECUTE FUNCTION public.update_candidate_phase_date();

-- Create trigger for new candidates to set screening date
CREATE TRIGGER set_initial_screening_date
  BEFORE INSERT ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_candidate_phase_date();
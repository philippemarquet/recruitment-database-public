-- Create enum for interview location
CREATE TYPE public.interview_location AS ENUM ('Kantoor', 'Digitaal', 'Elders');

-- Create interviews table
CREATE TABLE public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phase public.recruitment_phase NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  location public.interview_location,
  interview_notes TEXT,
  notes_submitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, notes_pending, notes_submitted
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for interviews
CREATE POLICY "Authenticated users can view interviews" 
ON public.interviews 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create interviews" 
ON public.interviews 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update interviews" 
ON public.interviews 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create actions table for tracking who needs to do what
CREATE TABLE public.candidate_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'schedule_interview', 'conduct_interview', 'submit_notes', 'review_candidate'
  phase public.recruitment_phase NOT NULL,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for candidate_actions
CREATE POLICY "Users can view their own actions" 
ON public.candidate_actions 
FOR SELECT 
USING (assigned_to = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create actions" 
ON public.candidate_actions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own actions" 
ON public.candidate_actions 
FOR UPDATE 
USING (assigned_to = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_candidate_actions_updated_at
BEFORE UPDATE ON public.candidate_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
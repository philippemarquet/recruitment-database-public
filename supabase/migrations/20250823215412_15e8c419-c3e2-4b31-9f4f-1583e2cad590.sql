-- Create enum for recruitment phases
CREATE TYPE public.recruitment_phase AS ENUM (
  'screening',
  'first_interview', 
  'second_interview',
  'third_interview',
  'negotiation',
  'on_hold',
  'rejected'
);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  position_applied TEXT NOT NULL,
  current_phase public.recruitment_phase NOT NULL DEFAULT 'screening',
  assigned_to UUID REFERENCES auth.users(id),
  cv_url TEXT,
  linkedin_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to access candidates
CREATE POLICY "Authenticated users can view all candidates" 
ON public.candidates 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create candidates" 
ON public.candidates 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidates" 
ON public.candidates 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete candidates" 
ON public.candidates 
FOR DELETE 
TO authenticated
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
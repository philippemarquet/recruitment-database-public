-- Create positions table for managing available job positions
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated can read positions" 
ON public.positions 
FOR SELECT 
USING (true);

CREATE POLICY "Managers can write positions" 
ON public.positions 
FOR ALL
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Create genders table for managing available gender options
CREATE TABLE public.genders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.genders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated can read genders" 
ON public.genders 
FOR SELECT 
USING (true);

CREATE POLICY "Managers can write genders" 
ON public.genders 
FOR ALL
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_genders_updated_at
BEFORE UPDATE ON public.genders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data
INSERT INTO public.positions (name, display_order) VALUES ('Business Consultant', 1);
INSERT INTO public.genders (name, display_order) VALUES ('Man', 1), ('Vrouw', 2);
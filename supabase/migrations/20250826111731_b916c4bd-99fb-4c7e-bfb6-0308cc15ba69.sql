-- Add source field to profiles for external recruiters
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS recruiter_source TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.profiles.recruiter_source IS 'Voor externe recruiters: de bron waarmee zij gekoppeld zijn (bijv. LinkedIn, Indeed, etc.)';

-- Update the handle_new_user function to include recruiter_source
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email, role)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    'medewerker'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Add new columns to candidates table
ALTER TABLE public.candidates 
ADD COLUMN seniority_level TEXT CHECK (seniority_level IN ('Junior', 'Medior', 'Senior')),
ADD COLUMN gender TEXT,
ADD COLUMN salary_requirements TEXT,
ADD COLUMN source TEXT CHECK (source IN ('Shift', 'Wennemars Recruits', 'Website', 'Linkedin', 'Eigen netwerk')),
ADD COLUMN application_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN general_information TEXT;

-- Create storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cv-uploads', 'cv-uploads', false);

-- Create storage policies for CV uploads
CREATE POLICY "Authenticated users can upload CVs" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'cv-uploads');

CREATE POLICY "Authenticated users can view CVs" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'cv-uploads');

CREATE POLICY "Authenticated users can update CVs" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'cv-uploads');

CREATE POLICY "Authenticated users can delete CVs" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'cv-uploads');
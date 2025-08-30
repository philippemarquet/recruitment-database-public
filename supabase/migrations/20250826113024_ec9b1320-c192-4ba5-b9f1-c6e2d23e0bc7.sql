-- Create extendable lookup tables for candidate source and seniority levels
CREATE TABLE IF NOT EXISTS public.candidate_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seniority_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seniority_levels ENABLE ROW LEVEL SECURITY;

-- Update triggers for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_candidate_sources_updated_at'
  ) THEN
    CREATE TRIGGER update_candidate_sources_updated_at
    BEFORE UPDATE ON public.candidate_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_seniority_levels_updated_at'
  ) THEN
    CREATE TRIGGER update_seniority_levels_updated_at
    BEFORE UPDATE ON public.seniority_levels
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helper function to check manager role via profiles table
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.role = 'manager'
  );
$$;

-- Policies: everyone authenticated can read; only managers can write
DROP POLICY IF EXISTS "Authenticated can read candidate_sources" ON public.candidate_sources;
CREATE POLICY "Authenticated can read candidate_sources"
ON public.candidate_sources
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Managers can write candidate_sources" ON public.candidate_sources;
CREATE POLICY "Managers can write candidate_sources"
ON public.candidate_sources
FOR ALL
TO authenticated
USING (public.is_manager(auth.uid()))
WITH CHECK (public.is_manager(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read seniority_levels" ON public.seniority_levels;
CREATE POLICY "Authenticated can read seniority_levels"
ON public.seniority_levels
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Managers can write seniority_levels" ON public.seniority_levels;
CREATE POLICY "Managers can write seniority_levels"
ON public.seniority_levels
FOR ALL
TO authenticated
USING (public.is_manager(auth.uid()))
WITH CHECK (public.is_manager(auth.uid()));

-- Seed defaults if empty
INSERT INTO public.candidate_sources (name)
SELECT x FROM (VALUES
  ('Shift'),
  ('Wennemars Recruits'),
  ('Website'),
  ('LinkedIn'),
  ('Eigen netwerk')
) v(x)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.seniority_levels (name)
SELECT x FROM (VALUES
  ('Junior'),
  ('Medior'),
  ('Senior'),
  ('Lead')
) v(x)
ON CONFLICT (name) DO NOTHING;

-- Storage policies for private cv-uploads bucket
-- Allow authenticated users to manage files in cv-uploads
DO $$ BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'CVs are viewable by authenticated users'
  ) THEN
    CREATE POLICY "CVs are viewable by authenticated users"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'cv-uploads');
  END IF;
  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload CVs'
  ) THEN
    CREATE POLICY "Authenticated users can upload CVs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'cv-uploads');
  END IF;
  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update CVs'
  ) THEN
    CREATE POLICY "Authenticated users can update CVs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'cv-uploads');
  END IF;
END $$;
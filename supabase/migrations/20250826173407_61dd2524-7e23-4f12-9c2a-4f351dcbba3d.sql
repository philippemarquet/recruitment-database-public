-- Fix assignment foreign key to reference profiles instead of auth.users
-- 1) Drop existing FK if it points to auth.users (causing 409 on update)
ALTER TABLE public.candidates
DROP CONSTRAINT IF EXISTS candidates_assigned_to_fkey;

-- 2) Create correct FK to public.profiles(id)
ALTER TABLE public.candidates
ADD CONSTRAINT candidates_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES public.profiles(id)
ON UPDATE CASCADE
ON DELETE SET NULL;

-- 3) Performance index for filtering by assignee
CREATE INDEX IF NOT EXISTS idx_candidates_assigned_to
  ON public.candidates (assigned_to);

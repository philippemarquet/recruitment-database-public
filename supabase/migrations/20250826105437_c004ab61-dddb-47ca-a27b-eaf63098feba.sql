-- Check if the foreign key constraint exists and add it if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'candidates_assigned_to_fkey' 
        AND table_name = 'candidates'
    ) THEN
        ALTER TABLE public.candidates 
        ADD CONSTRAINT candidates_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;
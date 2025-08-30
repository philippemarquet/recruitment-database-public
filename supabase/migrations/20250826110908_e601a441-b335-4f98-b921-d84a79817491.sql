-- Update existing profiles to use new role system
UPDATE public.profiles 
SET role = 'manager' 
WHERE role = 'admin';

-- You can manually set your own role and your partner's role to 'manager' after migration
-- The other roles will be: 'medewerker' and 'externe_recruiter'
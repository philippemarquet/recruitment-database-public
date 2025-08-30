-- Normalize candidate assignment to reference profiles.id instead of profiles.user_id
UPDATE public.candidates c
SET assigned_to = p.id
FROM public.profiles p
WHERE c.assigned_to = p.user_id;
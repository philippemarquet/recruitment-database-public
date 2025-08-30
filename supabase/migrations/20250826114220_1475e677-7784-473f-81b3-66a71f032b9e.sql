-- Fix candidate assignment - update to correct profile.id references
UPDATE candidates 
SET assigned_to = (
  SELECT p.id 
  FROM profiles p 
  WHERE p.user_id = candidates.assigned_to
)
WHERE assigned_to IS NOT NULL 
AND assigned_to IN (SELECT user_id FROM profiles);
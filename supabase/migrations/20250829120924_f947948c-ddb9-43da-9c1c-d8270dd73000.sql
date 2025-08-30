-- Allow external recruiters to view interviews for candidates they sourced
CREATE POLICY "External recruiters can view interviews for their sourced candidates"
ON interviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p
    JOIN candidates c ON c.id = interviews.candidate_id
    WHERE p.user_id = auth.uid() 
    AND p.role = 'externe_recruiter'
    AND p.recruiter_source IS NOT NULL
    AND c.source = p.recruiter_source
  )
);
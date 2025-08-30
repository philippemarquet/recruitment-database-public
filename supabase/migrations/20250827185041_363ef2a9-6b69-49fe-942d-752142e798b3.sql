-- Create missing actions for candidates that are already assigned but have no actions
INSERT INTO candidate_actions (candidate_id, assigned_to, action_type, phase, due_date)
SELECT 
  c.id as candidate_id,
  c.assigned_to,
  CASE 
    WHEN c.current_phase = 'screening' THEN 'screening_review'
    WHEN c.current_phase IN ('first_interview', 'second_interview', 'third_interview') THEN 'schedule_interview'
    WHEN c.current_phase = 'negotiation' THEN 'negotiation_result'
    ELSE 'screening_review'
  END as action_type,
  c.current_phase as phase,
  now() + interval '7 days' as due_date
FROM candidates c
WHERE c.assigned_to IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM candidate_actions ca 
    WHERE ca.candidate_id = c.id 
    AND ca.assigned_to = c.assigned_to 
    AND ca.completed = false
  );
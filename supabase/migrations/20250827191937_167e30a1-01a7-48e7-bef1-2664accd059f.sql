-- Backfill missing screening actions for assigned candidates without open actions
INSERT INTO public.candidate_actions (candidate_id, assigned_to, action_type, phase, due_date)
SELECT c.id, c.assigned_to, 'screening_review', c.current_phase, now() + interval '7 days'
FROM public.candidates c
LEFT JOIN (
  SELECT candidate_id, COUNT(*) FILTER (WHERE completed = false) AS open_count
  FROM public.candidate_actions
  GROUP BY candidate_id
) a ON a.candidate_id = c.id
WHERE c.assigned_to IS NOT NULL
  AND c.current_phase = 'screening'
  AND COALESCE(a.open_count, 0) = 0;
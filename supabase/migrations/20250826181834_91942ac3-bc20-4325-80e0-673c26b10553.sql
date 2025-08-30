-- Reset all candidates and actions for testing

-- Clear all candidate actions
DELETE FROM candidate_actions;

-- Reset all candidates to screening phase with no assignment
UPDATE candidates 
SET 
  current_phase = 'screening',
  assigned_to = NULL,
  screening_date = now(),
  first_interview_date = NULL,
  second_interview_date = NULL,
  third_interview_date = NULL,
  offer_date = NULL,
  final_decision_date = NULL,
  rejection_reason_id = NULL,
  rejected_by = NULL;
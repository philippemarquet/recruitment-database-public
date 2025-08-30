-- Clean up duplicate actions for Ricardo - mark the old submit_notes action as completed
UPDATE candidate_actions 
SET completed = true, completed_at = now() 
WHERE id = '06c18ba2-fb9f-43f7-a18f-a435c5dc351e' 
  AND candidate_id = '6e4bc2d4-5967-4800-9a0b-d7c5832ab7c9' 
  AND action_type = 'submit_notes' 
  AND assigned_to = '329596db-0095-4ea5-a135-0a207bb1a179';
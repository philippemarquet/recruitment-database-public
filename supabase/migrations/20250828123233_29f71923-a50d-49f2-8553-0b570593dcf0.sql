-- Fix the RLS policies for interviews - the INSERT policy is missing!
-- Add policy for creating interviews
CREATE POLICY "All employees can create interviews" ON public.interviews
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('medewerker', 'manager', 'hr_manager')
    )
  );

-- Also fix candidate_actions to prevent duplicate actions for the same candidate and phase
-- First let's add a unique constraint to prevent duplicate actions
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_actions_unique_phase 
ON public.candidate_actions (candidate_id, phase, action_type) 
WHERE completed = false;
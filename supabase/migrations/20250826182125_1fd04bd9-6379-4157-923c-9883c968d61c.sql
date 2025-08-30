-- Add HR manager role and update existing manager to HR manager

-- First, let's see what roles exist and update one to be HR manager
UPDATE profiles 
SET role = 'hr_manager' 
WHERE role = 'manager' 
LIMIT 1;

-- If no manager exists, we'll create the role enum to include hr_manager
-- Update the role constraint to allow hr_manager
-- Note: This assumes there's already a manager in the system to convert
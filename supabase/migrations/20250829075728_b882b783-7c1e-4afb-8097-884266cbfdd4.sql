-- Disable all email triggers immediately to prevent wrong emails
UPDATE email_triggers SET is_active = false WHERE is_active = true;

-- Add recipient_type to email_templates table
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'candidate';
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS description text;

-- Add recipient_type to email_triggers table  
ALTER TABLE email_triggers ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'candidate';
ALTER TABLE email_triggers ADD COLUMN IF NOT EXISTS description text;

-- Update email_logs to track recipient type
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'candidate';

-- Create recipient types enum for consistency
CREATE TYPE recipient_type AS ENUM ('candidate', 'action_owner', 'hr_manager', 'recruiter', 'manager', 'custom');

-- Update tables to use the enum
ALTER TABLE email_templates ALTER COLUMN recipient_type TYPE recipient_type USING recipient_type::recipient_type;
ALTER TABLE email_triggers ALTER COLUMN recipient_type TYPE recipient_type USING recipient_type::recipient_type;
ALTER TABLE email_logs ALTER COLUMN recipient_type TYPE recipient_type USING recipient_type::recipient_type;
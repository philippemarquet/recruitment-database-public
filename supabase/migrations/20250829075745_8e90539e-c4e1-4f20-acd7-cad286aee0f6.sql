-- Disable all email triggers immediately to prevent wrong emails
UPDATE email_triggers SET is_active = false WHERE is_active = true;

-- Add columns without enum first
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS recipient_type_temp text DEFAULT 'candidate';
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE email_triggers ADD COLUMN IF NOT EXISTS recipient_type_temp text DEFAULT 'candidate';  
ALTER TABLE email_triggers ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS recipient_type_temp text DEFAULT 'candidate';

-- Create recipient types enum
CREATE TYPE recipient_type AS ENUM ('candidate', 'action_owner', 'hr_manager', 'recruiter', 'manager', 'custom');

-- Now add the enum columns
ALTER TABLE email_templates ADD COLUMN recipient_type recipient_type DEFAULT 'candidate';
ALTER TABLE email_triggers ADD COLUMN recipient_type recipient_type DEFAULT 'candidate';  
ALTER TABLE email_logs ADD COLUMN recipient_type recipient_type DEFAULT 'candidate';

-- Copy data from temp columns to enum columns
UPDATE email_templates SET recipient_type = recipient_type_temp::recipient_type;
UPDATE email_triggers SET recipient_type = recipient_type_temp::recipient_type;
UPDATE email_logs SET recipient_type = recipient_type_temp::recipient_type;

-- Drop temp columns
ALTER TABLE email_templates DROP COLUMN recipient_type_temp;
ALTER TABLE email_triggers DROP COLUMN recipient_type_temp;
ALTER TABLE email_logs DROP COLUMN recipient_type_temp;
-- Add start_date and end_date columns to projects table for campaign scheduling
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS start_date timestamptz,
ADD COLUMN IF NOT EXISTS end_date timestamptz;

-- Add comments
COMMENT ON COLUMN projects.start_date IS 'Campaign start date (optional)';
COMMENT ON COLUMN projects.end_date IS 'Campaign end date (optional)';

-- Add locations column to projects table for managing POS points
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS locations jsonb DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN projects.locations IS 'List of POS locations: [{id, code, name, note}]';

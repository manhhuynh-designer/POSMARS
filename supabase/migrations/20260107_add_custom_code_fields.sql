-- Migration: Add custom code fields to projects table
-- Purpose: Enable dual-mode editing (Template Mode vs Code Mode) in admin panel

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS custom_html TEXT,
ADD COLUMN IF NOT EXISTS custom_script TEXT,
ADD COLUMN IF NOT EXISTS use_custom_code BOOLEAN DEFAULT FALSE;

-- Comments for documentation
COMMENT ON COLUMN projects.custom_html IS 'Custom HTML code for Code Mode (AR templates)';
COMMENT ON COLUMN projects.custom_script IS 'Custom JavaScript for Code Mode (AR templates)';
COMMENT ON COLUMN projects.use_custom_code IS 'Toggle between Template Mode (false) and Code Mode (true)';

-- 20260110_orphan_cleanup_functions.sql
-- RPC functions for orphan data management

-- 1. Function to find orphan leads (leads referencing non-existent projects)
CREATE OR REPLACE FUNCTION find_orphan_leads()
RETURNS TABLE(
    id bigint, 
    project_id uuid, 
    user_data jsonb, 
    created_at timestamptz
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id, 
        l.project_id, 
        l.user_data, 
        l.created_at
    FROM leads l
    LEFT JOIN projects p ON l.project_id = p.id
    WHERE p.id IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Function to delete orphan leads by ID array
CREATE OR REPLACE FUNCTION delete_orphan_leads(lead_ids bigint[])
RETURNS void AS $$
BEGIN
    DELETE FROM leads WHERE id = ANY(lead_ids);
END;
$$ LANGUAGE plpgsql;

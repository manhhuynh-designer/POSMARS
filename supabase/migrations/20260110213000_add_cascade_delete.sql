-- 20260110_add_cascade_delete.sql
-- Fix 409 Conflict when deleting projects by enabling Cascade Delete on leads

DO $$ 
BEGIN
    -- Drop existing Foreign Key constraint if it exists (name might vary, so we try to find it or drop by standard naming)
    -- Postgres usually names it leads_project_id_fkey by default if simplified syntax was used
    
    -- Try dropping the constraint. We use a more robust approach by checking constraint name from information_schema if needed, 
    -- but for standard migrations, we can try dropping the likely name.
    
    ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_project_id_fkey;
    
    -- Re-add with ON DELETE CASCADE
    ALTER TABLE leads
    ADD CONSTRAINT leads_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES projects(id)
    ON DELETE CASCADE;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering constraint: %', SQLERRM;
END $$;

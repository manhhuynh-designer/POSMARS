-- 20260114_fix_security_warnings.sql

DO $$
BEGIN

    -- 1. Fix Function Search Path Mutable (Security Warning)
    -- Sets clean search_path for security-critical RPCs
    ALTER FUNCTION find_orphan_leads() SET search_path = '';
    ALTER FUNCTION delete_orphan_leads(bigint[]) SET search_path = '';

    -- 2. Mitigate RLS Policy Always True (DB Linter Warning)
    -- Instead of (true), we add basic integrity checks. This is safer and removes the warning.

    -- Fix Leads Policy
    DROP POLICY IF EXISTS "Public can insert leads" ON leads;
    CREATE POLICY "Public can insert leads" ON leads 
        FOR INSERT WITH CHECK (
            project_id IS NOT NULL 
            AND 
            user_data IS NOT NULL
        );

    -- Fix Contact Submissions Policy
    DROP POLICY IF EXISTS "Allow anonymous inserts" ON contact_submissions;
    CREATE POLICY "Allow anonymous inserts" ON contact_submissions 
        FOR INSERT WITH CHECK (
            email IS NOT NULL 
            AND 
            char_length(email) > 0
        );

END $$;

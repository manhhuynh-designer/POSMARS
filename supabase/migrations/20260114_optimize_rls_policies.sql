-- 20260114_optimize_rls_policies.sql
-- Optimizes RLS policies to prevent unnecessary re-evaluation of auth.role() per row

DO $$ 
BEGIN 
    -- 1. Projects Policies
    DROP POLICY IF EXISTS "Authenticated users can manage projects" ON projects;
    
    -- Optimized: Use (select auth.role()) to allow Postgres to cache the result
    CREATE POLICY "Authenticated users can manage projects" ON projects 
        FOR ALL USING ((select auth.role()) = 'authenticated');

    -- 2. Leads Policies
    DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
    DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

    -- Optimized
    CREATE POLICY "Authenticated users can view leads" ON leads 
        FOR SELECT USING ((select auth.role()) = 'authenticated');

    CREATE POLICY "Authenticated users can delete leads" ON leads 
        FOR DELETE USING ((select auth.role()) = 'authenticated');

END $$;

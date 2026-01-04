-- 20240103_235959_final_schema.sql
-- Robust migration script

DO $$ 
BEGIN 
    -- 1. Projects - Add Columns if not exist
    BEGIN
        ALTER TABLE projects ADD COLUMN name TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE projects ADD COLUMN interaction_type TEXT DEFAULT 'ar';
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE projects ADD COLUMN template TEXT DEFAULT 'image_tracking';
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE projects ADD COLUMN lead_form_config JSONB DEFAULT '{
            "fields": [
                {"id": "name", "type": "text", "label": "Họ và tên", "required": true},
                {"id": "phone", "type": "tel", "label": "Số điện thoại", "required": true}
            ],
            "submit_text": "Tiếp tục",
            "consent_text": "Tôi đồng ý với điều khoản"
        }'::jsonb;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE projects ADD COLUMN template_config JSONB DEFAULT '{}'::jsonb;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE projects ADD COLUMN marker_url TEXT;
    EXCEPTION WHEN duplicate_column THEN END;

    -- 2. Leads - Add Columns if not exist
    BEGIN
        ALTER TABLE leads ADD COLUMN game_result JSONB DEFAULT NULL;
    EXCEPTION WHEN duplicate_column THEN END;

END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_projects_interaction_type ON projects(interaction_type);
CREATE INDEX IF NOT EXISTS idx_projects_template ON projects(template);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_pos_id ON leads(pos_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- 4. Update Data
UPDATE projects SET name = client_slug WHERE name IS NULL;
UPDATE projects SET interaction_type = 'ar' WHERE interaction_type IS NULL;
UPDATE projects SET template = 'image_tracking' WHERE template IS NULL;

-- 5. Policies (Drop all first to ensure clean state)
DO $$ 
BEGIN 
    -- Drop Policies on Projects
    DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON projects;
    DROP POLICY IF EXISTS "Public can view projects" ON projects;
    DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
    DROP POLICY IF EXISTS "Public can view active projects" ON projects;
    DROP POLICY IF EXISTS "Authenticated users can manage projects" ON projects;

    -- Drop Policies on Leads
    DROP POLICY IF EXISTS "Public can insert leads" ON leads;
    DROP POLICY IF EXISTS "Admins can view leads" ON leads;
    DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
    DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;
END $$;

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Re-create Policies

-- Projects: Public View Active
CREATE POLICY "Public can view active projects" ON projects 
    FOR SELECT USING (is_active = true);

-- Projects: Admins Manage All
CREATE POLICY "Authenticated users can manage projects" ON projects 
    FOR ALL USING (auth.role() = 'authenticated');

-- Leads: Public Insert
CREATE POLICY "Public can insert leads" ON leads 
    FOR INSERT WITH CHECK (true);

-- Leads: Admins View
CREATE POLICY "Authenticated users can view leads" ON leads 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Leads: Admins Delete
CREATE POLICY "Authenticated users can delete leads" ON leads 
    FOR DELETE USING (auth.role() = 'authenticated');

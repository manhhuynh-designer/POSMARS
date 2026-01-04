-- 20260103_rpc_functions.sql

-- 1. Create Lead Function (Public)
CREATE OR REPLACE FUNCTION create_lead(
  p_project_id UUID,
  p_user_data JSONB,
  p_pos_id TEXT,
  p_location_name TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_lead_id BIGINT;
BEGIN
  INSERT INTO leads (project_id, user_data, pos_id, location_name, consent)
  VALUES (p_project_id, p_user_data, p_pos_id, p_location_name, true)
  RETURNING id INTO v_lead_id;
  
  RETURN v_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_lead TO anon, authenticated, service_role;

-- 2. Update Lead Result Function (Public)
CREATE OR REPLACE FUNCTION update_lead_result(
  p_lead_id BIGINT,
  p_result JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leads 
  SET game_result = p_result
  WHERE id = p_lead_id;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_lead_result TO anon, authenticated, service_role;

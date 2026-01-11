-- 20260111_phone_validation.sql
-- Function to check if a phone number already exists in the project

CREATE OR REPLACE FUNCTION check_duplicate_phone(
  p_project_id UUID,
  p_phone TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if phone exists in user_data for this project
  SELECT EXISTS(
    SELECT 1 FROM leads
    WHERE project_id = p_project_id
    AND user_data->>'phone' = p_phone
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION check_duplicate_phone TO anon, authenticated, service_role;

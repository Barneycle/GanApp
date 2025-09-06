-- =====================================================
-- FIX EMAIL VALIDATION FOR PSU EMAILS
-- Allows both @parsu.edu.ph and .pbox@parsu.edu.ph
-- =====================================================

-- Create a custom email validation function
CREATE OR REPLACE FUNCTION validate_psu_email(email_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if email matches PSU format
  RETURN email_text ~* '^[A-Za-z0-9._%+-]+@(parsu\.edu\.ph|[A-Za-z0-9._%+-]+\.pbox\.parsu\.edu\.ph)$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the users table constraint to use our custom validation
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_email_format;

-- Add new constraint that allows both PSU email formats
ALTER TABLE users ADD CONSTRAINT valid_email_format 
CHECK (validate_psu_email(email));

-- Test the function
SELECT validate_psu_email('test@parsu.edu.ph') as standard_psu;
SELECT validate_psu_email('test.pbox@parsu.edu.ph') as pbox_psu;
SELECT validate_psu_email('test@gmail.com') as external_email;

-- Update existing RLS policies to use the new validation
DROP POLICY IF EXISTS "Allow user registration" ON users;
CREATE POLICY "Allow user registration" ON users 
FOR INSERT WITH CHECK (validate_psu_email(email));

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION validate_psu_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_psu_email(TEXT) TO anon;

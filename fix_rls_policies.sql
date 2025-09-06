-- Fix RLS policies for user registration
-- This script adds a policy that allows users to create their own profile during registration

-- Drop the restrictive admin-only insert policy
DROP POLICY IF EXISTS "Admins can insert new users" ON users;

-- Create a new policy that allows users to insert their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (
    -- Allow if the user is inserting their own profile (id matches auth.uid())
    auth.uid() = id
  );

-- Keep the admin policy for admin operations
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Alternative approach: Create a function to bypass RLS for user registration
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_username TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_type TEXT,
  user_organization TEXT DEFAULT NULL,
  user_position TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'participant'
)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO users (
    id, email, username, password_hash, first_name, last_name, 
    user_type, organization, position, role, phone, is_active, email_verified
  ) VALUES (
    user_id, user_email, user_username, '', user_first_name, user_last_name,
    user_type, user_organization, user_position, user_role, '', true, false
  );
  
  RETURN (SELECT * FROM users WHERE id = user_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

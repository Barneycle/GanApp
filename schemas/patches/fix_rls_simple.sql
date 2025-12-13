-- =====================================================
-- SIMPLE RLS FIX FOR USER REGISTRATION
-- Removes complex constraints that might be blocking registration
-- =====================================================

-- Temporarily disable RLS to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies
CREATE POLICY "Allow user registration" ON users 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own profile" ON users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage all users" ON users 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Test the policies
SELECT * FROM users LIMIT 1;

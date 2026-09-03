-- Fix RLS recursion issue for user registration
-- This script removes problematic policies and creates a simple one

-- First, disable RLS temporarily to see what's in the table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on the users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile (except role)" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update user roles" ON users;
DROP POLICY IF EXISTS "Admins can insert new users" ON users;
DROP POLICY IF EXISTS "Users cannot change own role" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a simple, non-recursive policy for user registration
CREATE POLICY "Allow user registration" ON users
  FOR INSERT WITH CHECK (true);

-- Create a simple policy for users to view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Create a simple policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create a simple policy for admins to view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create a simple policy for admins to manage all users
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

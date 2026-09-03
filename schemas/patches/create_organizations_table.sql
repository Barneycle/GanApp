-- =====================================================
-- CREATE ORGANIZATIONS TABLE
-- This table stores all affiliated organizations for users
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100), -- CAH, CBM, CEC, CED, COS, Campus names, Interest Groups, Fraternities & Sororities
  campus VARCHAR(100), -- Goa Campus, Sagñay Campus, etc.
  is_custom BOOLEAN DEFAULT false, -- True if added by a user via "Other" option
  created_by UUID, -- User who created this (for custom organizations)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_category ON organizations(category);
CREATE INDEX IF NOT EXISTS idx_organizations_campus ON organizations(campus);
CREATE INDEX IF NOT EXISTS idx_organizations_is_custom ON organizations(is_custom);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- RLS Policies
-- Allow all authenticated users to read organizations
CREATE POLICY "Allow authenticated users to read organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create custom organizations
CREATE POLICY "Allow authenticated users to create custom organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_custom = true);

-- Allow admins to manage all organizations
CREATE POLICY "Allow admins to manage organizations"
  ON organizations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        COALESCE(auth.users.raw_user_meta_data->>'role', 'participant') = 'admin'
        OR COALESCE(auth.users.raw_app_meta_data->>'role', 'participant') = 'admin'
      )
    )
  );

-- Add comment
COMMENT ON TABLE organizations IS 'Stores all affiliated organizations that users can select from';


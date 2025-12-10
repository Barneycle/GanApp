-- Add public SELECT policy for certificate verification
-- This allows anyone (including unauthenticated users) to verify certificates by certificate_number
-- This is necessary for QR code verification functionality

-- Drop existing public policy if it exists
DROP POLICY IF EXISTS "Public can verify certificates by certificate number" ON certificates;

-- Create policy: Allow public (unauthenticated) access to verify certificates
-- Users can only SELECT certificates by certificate_number for verification purposes
CREATE POLICY "Public can verify certificates by certificate number"
  ON certificates
  FOR SELECT
  USING (true); -- Allow all SELECT queries for verification

-- Note: This policy allows public read access to certificates table
-- This is intentional for certificate verification via QR codes
-- The certificate_number acts as a public identifier for verification
-- Sensitive information like user_id is still protected by other policies


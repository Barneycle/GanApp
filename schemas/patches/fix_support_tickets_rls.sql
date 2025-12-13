-- =====================================================
-- FIX SUPPORT TICKETS RLS POLICIES
-- Updates RLS policies to use is_admin() function instead of JWT checks
-- =====================================================

-- Helper function to check if user is admin (reuse if exists, otherwise create)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT COALESCE(
    (raw_user_meta_data->>'role')::text,
    (raw_app_meta_data->>'role')::text,
    'participant'
  )
  INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Drop old admin policies
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update any ticket" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can create messages in any ticket" ON support_messages;

-- Create new admin policies using is_admin() function
CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update any ticket"
  ON support_tickets FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all messages"
  ON support_messages FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create messages in any ticket"
  ON support_messages FOR INSERT
  WITH CHECK (
    is_admin(auth.uid())
    AND auth.uid() = sender_id
  );

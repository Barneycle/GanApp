-- =====================================================
-- FIX SURVEY INSERT POLICY
-- Add explicit INSERT policy for surveys table
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Event creators can manage surveys" ON surveys;

-- Create separate policies for different operations
CREATE POLICY "Event creators can insert surveys" ON surveys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Event creators can update surveys" ON surveys
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Event creators can delete surveys" ON surveys
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Keep the existing SELECT policies
CREATE POLICY "Admin can view all surveys" ON surveys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Organizers can view surveys for their events" ON surveys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Participants can view active surveys" ON surveys
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM event_registrations 
      WHERE event_id = surveys.event_id AND user_id = auth.uid()
    )
  );

-- Test the policies
SELECT 'Survey policies updated successfully' as status;

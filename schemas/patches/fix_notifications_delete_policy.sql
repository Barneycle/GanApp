-- Add DELETE policy for notifications table
-- This allows users to delete their own notifications

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());


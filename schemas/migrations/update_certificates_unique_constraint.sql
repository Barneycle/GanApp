-- =====================================================
-- Migration: Update certificates unique constraint
-- =====================================================
-- Purpose: Allow multiple certificates for the same (event_id, user_id)
--          when participant_name is different. This supports manual entries
--          where organizers can generate certificates for multiple participants
--          using their own user_id.
--
-- Old constraint: UNIQUE(event_id, user_id)
-- New constraint: UNIQUE(event_id, user_id, participant_name)
-- =====================================================

-- Drop the old unique constraint
ALTER TABLE certificates 
DROP CONSTRAINT IF EXISTS certificates_event_id_user_id_key;

-- Add the new unique constraint that includes participant_name
ALTER TABLE certificates 
ADD CONSTRAINT certificates_event_id_user_id_participant_name_key 
UNIQUE(event_id, user_id, participant_name);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT certificates_event_id_user_id_participant_name_key ON certificates IS 
'Ensures unique certificates per participant per event. Allows multiple certificates for the same (event_id, user_id) when participant_name differs (e.g., manual entries by organizers).';

-- Make get_next_certificate_number a single atomic upsert.
-- The previous SELECT-then-INSERT/UPDATE let concurrent first-time
-- calls both see a missing row and collide.

CREATE OR REPLACE FUNCTION get_next_certificate_number(event_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  INSERT INTO certificate_counters (event_id, current_count)
  VALUES (event_uuid, 1)
  ON CONFLICT (event_id)
  DO UPDATE SET
    current_count = certificate_counters.current_count + 1,
    updated_at = NOW()
  RETURNING current_count INTO next_number;

  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

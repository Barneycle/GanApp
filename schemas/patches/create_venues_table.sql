-- Create venues table for storing university event venues
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create updated_at trigger for venues table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_venues_updated_at 
    BEFORE UPDATE ON venues 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial university venues
INSERT INTO venues (name) VALUES
('Auditorium'),
('Gymnasium'),
('AVR - CEC'),
('AVR - CAH'),
('AVR - IIT'),
('RND Hall');

-- Enable Row Level Security (RLS)
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venues table
-- Allow everyone to read active venues
CREATE POLICY "Everyone can read active venues" ON venues
  FOR SELECT USING (is_active = true);

-- Allow authenticated users to insert venues (for "Other" functionality)
CREATE POLICY "Authenticated users can create venues" ON venues
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow creators and admins to update their venues
CREATE POLICY "Users can update their own venues" ON venues
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('administrator', 'organizer')
    )
  );

-- Allow admins to delete venues
CREATE POLICY "Admins can delete venues" ON venues
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'administrator'
    )
  );

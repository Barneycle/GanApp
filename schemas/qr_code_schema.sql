-- QR Code Schema for GanApp
-- This creates the necessary tables for QR code generation and scan tracking

-- QR Codes table to store user QR codes
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    qr_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR Scans table to track when QR codes are scanned
CREATE TABLE IF NOT EXISTS qr_scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scanner_info TEXT, -- Information about who/what scanned the QR code
    location_info TEXT, -- Optional location information
    device_info TEXT -- Optional device information
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_user_id ON qr_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);

-- Enable Row Level Security (RLS)
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qr_codes table
-- Users can only see their own QR codes
CREATE POLICY "Users can view their own QR codes" ON qr_codes
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own QR codes
CREATE POLICY "Users can insert their own QR codes" ON qr_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own QR codes
CREATE POLICY "Users can update their own QR codes" ON qr_codes
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own QR codes
CREATE POLICY "Users can delete their own QR codes" ON qr_codes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for qr_scans table
-- Users can only see scans of their own QR codes
CREATE POLICY "Users can view scans of their QR codes" ON qr_scans
    FOR SELECT USING (auth.uid() = user_id);

-- Anyone can insert scan records (for when QR codes are scanned)
CREATE POLICY "Anyone can insert scan records" ON qr_scans
    FOR INSERT WITH CHECK (true);

-- Only the QR code owner can update scan records
CREATE POLICY "QR code owners can update scan records" ON qr_scans
    FOR UPDATE USING (auth.uid() = user_id);

-- Only the QR code owner can delete scan records
CREATE POLICY "QR code owners can delete scan records" ON qr_scans
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_qr_codes_updated_at 
    BEFORE UPDATE ON qr_codes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- INSERT INTO qr_codes (user_id, qr_data) VALUES 
-- ('your-user-id-here', '{"userId": "your-user-id-here", "userEmail": "test@example.com", "userName": "Test User", "userRole": "participant", "generatedAt": "2024-01-01T00:00:00Z", "type": "user_qr"}');

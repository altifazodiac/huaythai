-- Create table for half payout rules (หารครึ่ง)
CREATE TABLE half_payout_rules (
    id SERIAL PRIMARY KEY,
    lottery_sub_type_id INTEGER NOT NULL REFERENCES lottery_sub_types(lottery_sub_type_id) ON DELETE CASCADE,
    digit_number INTEGER NOT NULL CHECK (digit_number IN (1, 2, 3, 4)),
    type_number VARCHAR(50) NOT NULL,
    number_pattern VARCHAR(10) NOT NULL,
    half_multiplier DECIMAL(4,3) NOT NULL DEFAULT 0.500,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_half_payout_rules_sub_type ON half_payout_rules(lottery_sub_type_id);
CREATE INDEX idx_half_payout_rules_digit_type ON half_payout_rules(digit_number, type_number);
CREATE INDEX idx_half_payout_rules_pattern ON half_payout_rules(number_pattern);
CREATE INDEX idx_half_payout_rules_active ON half_payout_rules(is_active);

-- Create unique constraint to prevent duplicate rules
CREATE UNIQUE INDEX unique_half_payout_rule ON half_payout_rules(
    lottery_sub_type_id, 
    digit_number, 
    type_number, 
    number_pattern
) WHERE is_active = true;

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_half_payout_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_half_payout_rules_updated_at
    BEFORE UPDATE ON half_payout_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_half_payout_rules_updated_at();

-- Insert default rules for Government Lottery (lottery_sub_type_id = 1)
INSERT INTO half_payout_rules (lottery_sub_type_id, digit_number, type_number, number_pattern, half_multiplier, is_active) VALUES
    (1, 3, 'บน', 'default', 0.500, true),
    (1, 3, 'โต๊ด', 'default', 0.500, true),
    (1, 2, 'ล่าง', 'default', 0.500, true);

-- Add RLS (Row Level Security) if needed
ALTER TABLE half_payout_rules ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to view half payout rules" ON half_payout_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert half payout rules" ON half_payout_rules
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update half payout rules" ON half_payout_rules
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete half payout rules" ON half_payout_rules
    FOR DELETE TO authenticated USING (true); 
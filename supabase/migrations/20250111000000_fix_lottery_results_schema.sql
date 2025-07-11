-- Fix lottery_results table schema
-- This migration fixes the schema conflicts and creates the correct structure

-- Drop the existing lottery_results table if it exists and recreate with correct schema
DROP TABLE IF EXISTS public.lottery_results CASCADE;

-- Create the corrected lottery_results table with the schema that the code expects
CREATE TABLE public.lottery_results (
    id BIGSERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES public.lottery_types(lottery_type_id),
    lottery_sub_type_id INTEGER NOT NULL REFERENCES public.lottery_sub_types(lottery_sub_type_id),
    schedule_id INTEGER NOT NULL REFERENCES public.drawing_schedules(schedule_id),
    draw_date DATE NOT NULL,
    draw_time TIME,
    prize_code TEXT NOT NULL,
    winning_number TEXT NOT NULL,
    is_sent_to_line BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create unique constraint for ON CONFLICT clauses
CREATE UNIQUE INDEX idx_lottery_results_unique_result 
ON public.lottery_results (lottery_sub_type_id, schedule_id, draw_date, draw_time, prize_code);

-- Alternative unique constraint for different ON CONFLICT usage
CREATE UNIQUE INDEX idx_lottery_results_unique_schedule_date_prize 
ON public.lottery_results (schedule_id, draw_date, prize_code);

-- Create additional indexes for performance
CREATE INDEX idx_lottery_results_draw_date ON public.lottery_results(draw_date);
CREATE INDEX idx_lottery_results_lottery_type_id ON public.lottery_results(lottery_type_id);
CREATE INDEX idx_lottery_results_lottery_sub_type_id ON public.lottery_results(lottery_sub_type_id);
CREATE INDEX idx_lottery_results_schedule_id ON public.lottery_results(schedule_id);
CREATE INDEX idx_lottery_results_is_sent_to_line ON public.lottery_results(is_sent_to_line);

-- Enable RLS
ALTER TABLE public.lottery_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.lottery_results
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.lottery_results
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable update for authenticated users" ON public.lottery_results
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable delete for authenticated users" ON public.lottery_results
    FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at_lottery_results()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_lottery_results_updated_at
    BEFORE UPDATE ON public.lottery_results
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_lottery_results();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_results TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE public.lottery_results_id_seq TO anon, authenticated, service_role; 
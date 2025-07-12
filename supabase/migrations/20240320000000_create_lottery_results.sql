-- Create lottery results table
CREATE TABLE public.lottery_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draw_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lottery result numbers table to store individual number results
CREATE TABLE public.lottery_result_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lottery_result_id UUID NOT NULL REFERENCES public.lottery_results(id) ON DELETE CASCADE,
    ticket_sub_type_id UUID NOT NULL REFERENCES public.lottery_sub_types(id),
    numbers TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(lottery_result_id, ticket_sub_type_id)
);

-- Create index for faster lookups
CREATE INDEX idx_lottery_results_draw_date ON public.lottery_results(draw_date);
CREATE INDEX idx_lottery_result_numbers_lottery_result_id ON public.lottery_result_numbers(lottery_result_id);
CREATE INDEX idx_lottery_result_numbers_ticket_sub_type_id ON public.lottery_result_numbers(ticket_sub_type_id);

-- Add RLS policies
ALTER TABLE public.lottery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_result_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies for lottery_results
CREATE POLICY "Enable read access for all users" ON public.lottery_results
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.lottery_results
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.lottery_results
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policies for lottery_result_numbers
CREATE POLICY "Enable read access for all users" ON public.lottery_result_numbers
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.lottery_result_numbers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.lottery_result_numbers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_lottery_results
    BEFORE UPDATE ON public.lottery_results
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_lottery_result_numbers
    BEFORE UPDATE ON public.lottery_result_numbers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 
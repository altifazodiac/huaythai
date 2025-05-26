-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for status fields
CREATE TYPE ticket_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE draw_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE winning_status AS ENUM ('pending', 'paid', 'cancelled');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create lottery_tickets table
CREATE TABLE public.lottery_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    draw_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ticket_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lottery_ticket_items table
CREATE TABLE public.lottery_ticket_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.lottery_tickets(id) ON DELETE CASCADE NOT NULL,
    lottery_sub_type_id INTEGER REFERENCES public.lottery_sub_types(lottery_sub_type_id) NOT NULL,
    lottery_sub_number_id INTEGER REFERENCES public.lottery_sub_number(id) NOT NULL,
    numbers TEXT[] NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create lottery_draws table
CREATE TABLE public.lottery_draws (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draw_date DATE NOT NULL,
    draw_time TIME NOT NULL,
    status draw_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_draw_date_time UNIQUE (draw_date, draw_time)
);

-- Create lottery_results table
CREATE TABLE public.lottery_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draw_id UUID REFERENCES public.lottery_draws(id) NOT NULL,
    lottery_sub_type_id INTEGER REFERENCES public.lottery_sub_types(lottery_sub_type_id) NOT NULL,
    winning_numbers TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_draw_sub_type UNIQUE (draw_id, lottery_sub_type_id)
);

-- Create lottery_winnings table
CREATE TABLE public.lottery_winnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_item_id UUID REFERENCES public.lottery_ticket_items(id) NOT NULL,
    draw_id UUID REFERENCES public.lottery_draws(id) NOT NULL,
    winning_amount DECIMAL(10,2) NOT NULL,
    status winning_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT positive_winning_amount CHECK (winning_amount > 0)
);

-- Create indexes for performance optimization
CREATE INDEX idx_lottery_tickets_user_id ON public.lottery_tickets(user_id);
CREATE INDEX idx_lottery_tickets_draw_date ON public.lottery_tickets(draw_date);
CREATE INDEX idx_lottery_tickets_purchase_date ON public.lottery_tickets(purchase_date);
CREATE INDEX idx_lottery_tickets_status ON public.lottery_tickets(status);

CREATE INDEX idx_lottery_ticket_items_ticket_id ON public.lottery_ticket_items(ticket_id);
CREATE INDEX idx_lottery_ticket_items_sub_type_id ON public.lottery_ticket_items(lottery_sub_type_id);
CREATE INDEX idx_lottery_ticket_items_sub_number_id ON public.lottery_ticket_items(lottery_sub_number_id);

CREATE INDEX idx_lottery_draws_draw_date ON public.lottery_draws(draw_date);
CREATE INDEX idx_lottery_draws_status ON public.lottery_draws(status);

CREATE INDEX idx_lottery_results_draw_id ON public.lottery_results(draw_id);
CREATE INDEX idx_lottery_results_sub_type_id ON public.lottery_results(lottery_sub_type_id);

CREATE INDEX idx_lottery_winnings_ticket_item_id ON public.lottery_winnings(ticket_item_id);
CREATE INDEX idx_lottery_winnings_draw_id ON public.lottery_winnings(draw_id);
CREATE INDEX idx_lottery_winnings_status ON public.lottery_winnings(status);

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_lottery_tickets
    BEFORE UPDATE ON public.lottery_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_lottery_ticket_items
    BEFORE UPDATE ON public.lottery_ticket_items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_lottery_draws
    BEFORE UPDATE ON public.lottery_draws
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_lottery_results
    BEFORE UPDATE ON public.lottery_results
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_lottery_winnings
    BEFORE UPDATE ON public.lottery_winnings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.lottery_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_winnings ENABLE ROW LEVEL SECURITY;

-- Create policies for lottery_tickets
CREATE POLICY "Users can view their own tickets"
    ON public.lottery_tickets
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
    ON public.lottery_tickets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
    ON public.lottery_tickets
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policies for lottery_ticket_items
CREATE POLICY "Users can view their own ticket items"
    ON public.lottery_ticket_items
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.lottery_tickets
        WHERE lottery_tickets.id = lottery_ticket_items.ticket_id
        AND lottery_tickets.user_id = auth.uid()
    ));

CREATE POLICY "Users can create their own ticket items"
    ON public.lottery_ticket_items
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.lottery_tickets
        WHERE lottery_tickets.id = lottery_ticket_items.ticket_id
        AND lottery_tickets.user_id = auth.uid()
    ));

-- Create policies for lottery_draws
CREATE POLICY "Anyone can view draws"
    ON public.lottery_draws
    FOR SELECT
    USING (true);

CREATE POLICY "Only authenticated users can create draws"
    ON public.lottery_draws
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update draws"
    ON public.lottery_draws
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Create policies for lottery_results
CREATE POLICY "Anyone can view results"
    ON public.lottery_results
    FOR SELECT
    USING (true);

CREATE POLICY "Only authenticated users can create results"
    ON public.lottery_results
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update results"
    ON public.lottery_results
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Create policies for lottery_winnings
CREATE POLICY "Users can view their own winnings"
    ON public.lottery_winnings
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.lottery_ticket_items
        JOIN public.lottery_tickets ON lottery_tickets.id = lottery_ticket_items.ticket_id
        WHERE lottery_ticket_items.id = lottery_winnings.ticket_item_id
        AND lottery_tickets.user_id = auth.uid()
    ));

CREATE POLICY "Only authenticated users can update winnings"
    ON public.lottery_winnings
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Create function to calculate total amount for a ticket
CREATE OR REPLACE FUNCTION public.calculate_ticket_total(ticket_id UUID)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.lottery_ticket_items
        WHERE ticket_id = $1
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to update ticket total amount
CREATE OR REPLACE FUNCTION public.update_ticket_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.lottery_tickets
    SET total_amount = public.calculate_ticket_total(NEW.ticket_id)
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update ticket total amount
CREATE TRIGGER update_ticket_total_after_item_change
    AFTER INSERT OR UPDATE OR DELETE ON public.lottery_ticket_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ticket_total();

-- Create function to check if draw date is valid
CREATE OR REPLACE FUNCTION public.check_valid_draw_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.draw_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Draw date cannot be in the past';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate draw date
CREATE TRIGGER validate_draw_date
    BEFORE INSERT OR UPDATE ON public.lottery_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.check_valid_draw_date();

-- Create function to validate winning numbers
CREATE OR REPLACE FUNCTION public.validate_winning_numbers()
RETURNS TRIGGER AS $$
BEGIN
    -- Add validation logic here based on your requirements
    -- For example, check if numbers match the expected format
    IF array_length(NEW.winning_numbers, 1) = 0 THEN
        RAISE EXCEPTION 'Winning numbers cannot be empty';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate winning numbers
CREATE TRIGGER validate_winning_numbers
    BEFORE INSERT OR UPDATE ON public.lottery_results
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_winning_numbers(); 
-- Add bill_number and bill_name columns to lottery_tickets
ALTER TABLE public.lottery_tickets
ADD COLUMN bill_number VARCHAR(6) NOT NULL UNIQUE,
ADD COLUMN bill_name TEXT;

-- Optionally, you can fill bill_number for existing rows with random 6-digit numbers
UPDATE public.lottery_tickets
SET bill_number = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE bill_number IS NULL; 
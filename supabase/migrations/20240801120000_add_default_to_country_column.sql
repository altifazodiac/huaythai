ALTER TABLE public.lottery_api_results
ALTER COLUMN country SET DEFAULT 'Thailand';

-- Backfill existing rows with NULL country
UPDATE public.lottery_api_results
SET country = 'Thailand'
WHERE country IS NULL; 
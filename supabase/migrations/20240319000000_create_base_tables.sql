-- Create lottery_types table
CREATE TABLE public.lottery_types (
    lottery_type_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lottery_sub_types table
CREATE TABLE public.lottery_sub_types (
    lottery_sub_type_id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES public.lottery_types(lottery_type_id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    payout_rate DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lottery_sub_number table
CREATE TABLE public.lottery_sub_number (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lottery_sub_type_id INT NOT NULL,
    length INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create lottery_name_aliases table
CREATE TABLE public.lottery_name_aliases (
    alias_id SERIAL PRIMARY KEY,
    lottery_sub_type_id INTEGER NOT NULL REFERENCES public.lottery_sub_types(lottery_sub_type_id),
    alias_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create drawing_schedules table
CREATE TABLE public.drawing_schedules (
    schedule_id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES public.lottery_types(lottery_type_id),
    draw_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create animal_numbers table
CREATE TABLE public.animal_numbers (
    animal_number_id SERIAL PRIMARY KEY,
    number_code VARCHAR(10) NOT NULL,
    animal_name VARCHAR(255) NOT NULL,
    lottery_sub_type_id INTEGER NOT NULL REFERENCES public.lottery_sub_types(lottery_sub_type_id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lottery_api_results table
CREATE TABLE public.lottery_api_results (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(255),
    results JSONB,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
); 
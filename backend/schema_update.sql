-- Create fee_structures table
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_category VARCHAR(50) NOT NULL,
    class_name VARCHAR(50),
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default fee structures based on the image
INSERT INTO public.fee_structures (fee_category, class_name, amount) VALUES
('tuition', 'Kindergarten', 1400),
('tuition', '1', 1500),
('tuition', '2', 1500),
('tuition', '3', 1600),
('tuition', '4', 1600),
('tuition', '5', 1600),
('tuition', '6', 1700),
('tuition', '7', 1700),
('tuition', '8', 1700),
('tuition', '9', 1800),
('tuition', '10', 1800),
('admission_form', NULL, 500),
('admission_fee', NULL, 4500),
('essentials_kit', NULL, 800),
('amc', NULL, 4000),
('transport_base', NULL, 1100),
('transport_per_km', NULL, 100);

-- Modify users table
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS transport_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS transport_distance_km NUMERIC DEFAULT 0;

-- Modify fee table
ALTER TABLE public.fee ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other';
ALTER TABLE public.fee ADD COLUMN IF NOT EXISTS late_fee_applicable BOOLEAN DEFAULT FALSE;

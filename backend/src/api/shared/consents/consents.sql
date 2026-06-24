-- Create the consents table
CREATE TABLE IF NOT EXISTS public.consents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    class_id UUID REFERENCES public.class(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public."user"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional, depending on your setup)
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- Create the consent_responses table
CREATE TABLE IF NOT EXISTS public.consent_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    consent_id UUID REFERENCES public.consents(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public."user"(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(consent_id, student_id)
);

-- Enable RLS (Optional, depending on your setup)
ALTER TABLE public.consent_responses ENABLE ROW LEVEL SECURITY;

-- Policies for consents table (Example, adjust based on your auth structure)
CREATE POLICY "Enable read access for all authenticated users" ON public.consents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.consents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.consents FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.consents FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for consent_responses table
CREATE POLICY "Enable read access for all authenticated users" ON public.consent_responses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.consent_responses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.consent_responses FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.consent_responses FOR DELETE USING (auth.role() = 'authenticated');

-- Create the bridging table for class-subject mappings
CREATE TABLE IF NOT EXISTS public.class_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subject(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a subject isn't mapped to the same class more than once
    UNIQUE(class_id, subject_id)
);

-- Enable RLS (Row Level Security) and grant public access
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.class_subjects FOR ALL USING (true);

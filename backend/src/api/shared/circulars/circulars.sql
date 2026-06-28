-- Create the circulars table
CREATE TABLE IF NOT EXISTS public.circulars (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    attachment_url TEXT,
    target_audience TEXT NOT NULL DEFAULT 'all', -- 'all', 'teachers', 'class'
    class_id UUID REFERENCES public.class(id) ON DELETE CASCADE, -- NULL if audience is 'all' or 'teachers'
    created_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.circulars ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable select access for authenticated users" 
ON public.circulars FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all actions for admin/principal" 
ON public.circulars FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public."user" 
    WHERE id = auth.uid() AND type IN ('admin', 'principal')
  )
);

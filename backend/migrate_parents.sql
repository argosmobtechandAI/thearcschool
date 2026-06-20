-- 1. Create the new parents table
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    father_name TEXT,
    mother_name TEXT,
    phone TEXT,
    alternate_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the mapping table
CREATE TABLE IF NOT EXISTS public.student_parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.user(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
    UNIQUE(student_id, parent_id)
);

-- 3. Extract and insert unique parents based on Phone Number
-- This groups siblings who share the same parent phone number
INSERT INTO public.parents (father_name, mother_name, phone, alternate_number)
SELECT 
    MAX(father_name) as father_name, 
    MAX(mother_name) as mother_name, 
    phone, 
    MAX(alternate_number) as alternate_number
FROM public.user
WHERE type = 'student' 
  AND NULLIF(TRIM(phone), '') IS NOT NULL
GROUP BY phone;

-- 4. Map the students to their parents using the Phone Number
INSERT INTO public.student_parents (student_id, parent_id)
SELECT u.id, p.id
FROM public.user u
JOIN public.parents p ON p.phone = u.phone
WHERE u.type = 'student' AND NULLIF(TRIM(u.phone), '') IS NOT NULL;

-- 5. Extract and insert remaining unique parents (for students without a phone number)
-- This groups siblings who share the exact same father's and mother's name
INSERT INTO public.parents (father_name, mother_name)
SELECT DISTINCT father_name, mother_name
FROM public.user
WHERE type = 'student' 
  AND NULLIF(TRIM(phone), '') IS NULL
  AND (NULLIF(TRIM(father_name), '') IS NOT NULL OR NULLIF(TRIM(mother_name), '') IS NOT NULL);

-- 6. Map the remaining students to their parents using Names
INSERT INTO public.student_parents (student_id, parent_id)
SELECT u.id, p.id
FROM public.user u
JOIN public.parents p ON p.father_name = u.father_name AND p.mother_name = u.mother_name
WHERE u.type = 'student' 
  AND NULLIF(TRIM(u.phone), '') IS NULL
  AND (NULLIF(TRIM(u.father_name), '') IS NOT NULL OR NULLIF(TRIM(u.mother_name), '') IS NOT NULL)
  AND p.phone IS NULL;

-- 7. Secure the tables (Optional but recommended)
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users (adjust as needed for your specific security rules)
CREATE POLICY "Enable read access for all authenticated users" ON public.parents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for all authenticated users" ON public.student_parents FOR SELECT TO authenticated USING (true);

-- ==============================================================
-- 🔧 FINALIZE DATABASE UUID MIGRATION
-- ==============================================================
-- This script safely drops the remaining integer-based tables
-- and recreates them using UUID primary keys. It also fixes all
-- broken foreign keys (like class_id) to use UUID.
-- ==============================================================

-- 1. Drop Duplicate Subjects Table
DROP TABLE IF EXISTS public.subjects CASCADE;

-- 2. Drop Remaining Integer Tables
DROP TABLE IF EXISTS public.complaints CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.communication CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.course CASCADE;
DROP TABLE IF EXISTS public.course_submissions CASCADE;
DROP TABLE IF EXISTS public.timeTable CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.schoolInfo CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;

-- 3. Recreate Tables with UUIDs

CREATE TABLE public.complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.communication (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.user(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.user(id) ON DELETE CASCADE,
    subject TEXT,
    message TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE,
    time TIME,
    location TEXT,
    attendees INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled',
    approval TEXT DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.schoolInfo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.course (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES public.class(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    chapter TEXT,
    dueDate DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.course_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.course(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.user(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    submittedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.timeTable (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES public.class(id) ON DELETE CASCADE,
    subject TEXT,
    teacher_id UUID REFERENCES public.user(id) ON DELETE SET NULL,
    day_of_week TEXT,
    time_slot TEXT,
    is_break BOOLEAN DEFAULT FALSE,
    room_number TEXT,
    date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.user(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.course(id) ON DELETE CASCADE,
    marks NUMERIC DEFAULT 0,
    max_marks NUMERIC DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

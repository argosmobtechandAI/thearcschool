-- ============================================================
-- THE ARC SCHOOL - COMPLETE SUPABASE DATABASE SCHEMA
-- Reverse-engineered from backend API, admin panel, and mobile apps
-- Run this on a fresh self-hosted Supabase instance
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USER TABLE (public.user)
--    Supabase Auth syncs auth.users → public.user via trigger
-- ============================================================
CREATE TABLE IF NOT EXISTS public."user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    type TEXT DEFAULT 'student',  -- student, teacher, parent, admin, principal, finance, admission, super_admin
    gender TEXT,
    dob DATE,
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    address TEXT,

    -- Student-specific fields
    admission_number TEXT,
    house TEXT,
    father_name TEXT,
    mother_name TEXT,
    monthly_fee NUMERIC DEFAULT 0,
    bus_fee NUMERIC DEFAULT 0,
    bus_start_date DATE,
    fee_exempted BOOLEAN DEFAULT FALSE,
    admission_date DATE,
    form_submitted BOOLEAN DEFAULT FALSE,
    leave_school BOOLEAN DEFAULT FALSE,
    tc_received BOOLEAN DEFAULT FALSE,
    tc_date DATE,
    slc_received BOOLEAN DEFAULT FALSE,
    slc_date DATE,
    character_certificate_received BOOLEAN DEFAULT FALSE,
    character_certificate_date DATE,
    tc_document_url TEXT,
    slc_document_url TEXT,
    character_certificate_document_url TEXT,

    -- Finance access
    can_view_revenue BOOLEAN DEFAULT FALSE,

    -- Complaints (legacy field, stored as JSONB array of complaint IDs)
    complaints JSONB DEFAULT '[]'::JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TRIGGER: Sync auth.users → public.user on sign-up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."user" (id, name, email, phone, type, gender, dob, status, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'name',
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'type', 'student'),
        NEW.raw_user_meta_data->>'gender',
        CASE
            WHEN NEW.raw_user_meta_data->>'dob' IS NOT NULL AND NEW.raw_user_meta_data->>'dob' != ''
            THEN (NEW.raw_user_meta_data->>'dob')::DATE
            ELSE NULL
        END,
        COALESCE(NEW.raw_user_meta_data->>'status', 'active'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. PARENTS TABLE (for parent users not in auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    father_name TEXT,
    mother_name TEXT,
    phone TEXT,
    alternate_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. STUDENT-PARENT MAPPING TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_parents (
    id BIGSERIAL PRIMARY KEY,
    parent_id UUID NOT NULL,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_connections (
    id BIGSERIAL PRIMARY KEY,
    parent_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. TEACHER DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_details (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    doj DATE,                         -- Date of Joining
    father_spouse_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. STAFF DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_details (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    access_level TEXT,                -- admin, admission, finance, principal
    job_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. CLASS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    section TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. CLASS-STUDENT MAPPING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_students (
    id BIGSERIAL PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (class_id, student_id)
);

-- ============================================================
-- 9. CLASS-TEACHER MAPPING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_teachers (
    id BIGSERIAL PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (class_id, teacher_id)
);

-- ============================================================
-- 10. SUBJECT TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subject (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. CLASS-SUBJECT MAPPING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_subjects (
    id BIGSERIAL PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subject(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (class_id, subject_id)
);

-- ============================================================
-- 12. SUBJECT-TEACHER MAPPING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subject_teachers (
    id BIGSERIAL PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subject(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. EXAMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exams (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,              -- e.g. "Term 1", "Unit Test"
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    date DATE,
    time TEXT,
    subject TEXT,
    duration INTEGER,                 -- in minutes
    marks INTEGER,                    -- max marks
    room_number TEXT,
    invigilator_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. GRADES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grades (
    id BIGSERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    exam_id BIGINT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    marks NUMERIC,
    max_marks NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. GRADING SCALES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grading_scales (
    id BIGSERIAL PRIMARY KEY,
    grade TEXT NOT NULL,
    min_percentage NUMERIC NOT NULL,
    max_percentage NUMERIC NOT NULL,
    color_hex TEXT DEFAULT '#000000',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default grading scales
INSERT INTO public.grading_scales (grade, min_percentage, max_percentage, color_hex) VALUES
    ('A+', 90, 100, '#16a34a'),
    ('A', 80, 89.99, '#16a34a'),
    ('B', 70, 79.99, '#3b82f6'),
    ('C', 60, 69.99, '#eab308'),
    ('D', 50, 59.99, '#f97316'),
    ('F', 0, 49.99, '#ef4444')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 16. ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT,                      -- Present, Absent, Late, etc.
    marked_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, date)
);

-- ============================================================
-- 17. TIMETABLE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.timetable (
    id BIGSERIAL PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    date DATE,
    day_of_week TEXT,                 -- e.g. "monday", "tuesday"
    teacher_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    time_slot TEXT,                   -- e.g. "09:00 - 09:45"
    subject TEXT,
    is_break BOOLEAN DEFAULT FALSE,
    room_number TEXT,
    teacher TEXT,                     -- legacy field (teacher name)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. COMPLAINTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.complaints (
    id BIGSERIAL PRIMARY KEY,
    student_id UUID REFERENCES public."user"(id) ON DELETE CASCADE,
    date DATE,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 19. ROOMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    capacity INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 20. COMMUNICATION TABLE (Chat / Broadcasts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.communication (
    id BIGSERIAL PRIMARY KEY,
    sender_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    message TEXT,
    type TEXT,                        -- live_chat, broadcast, complaint, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 21. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    title TEXT,
    message TEXT,
    type TEXT,                        -- broadcast, exam, attendance, timetable, course, consent, event, communication
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 22. ACTIVITIES TABLE (Principal Dashboard)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activities (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    title TEXT,
    message TEXT,
    type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 23. USER DEVICE TOKENS (FCM Push Notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    device_type TEXT,                 -- ios, android, web
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 24. NEW USERS / ADMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public."newUsers" (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    parent TEXT,
    "parentEmail" TEXT,
    phone TEXT,
    status TEXT DEFAULT 'pending',    -- pending, approved, rejected
    dob DATE,
    gender TEXT,
    documents JSONB DEFAULT '[]'::JSONB,
    assigned_to UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.class(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 25. ANNUAL PLANNER (Events)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.annual_planner (
    id BIGSERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,           -- holiday, exam, event, etc.
    target_classes JSONB DEFAULT '["All"]'::JSONB,
    requires_consent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 26. EVENT CONSENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_consents (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES public.annual_planner(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',    -- pending, approved, declined
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 27. CONSENTS (Admin-created consent forms)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consents (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    class_id UUID REFERENCES public.class(id) ON DELETE CASCADE,
    event_date DATE,
    created_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 28. CONSENT RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consent_responses (
    id BIGSERIAL PRIMARY KEY,
    consent_id BIGINT NOT NULL REFERENCES public.consents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',    -- pending, accepted, declined
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 29. FEE STRUCTURES (Virtual fee configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id BIGSERIAL PRIMARY KEY,
    fee_category TEXT NOT NULL,       -- e.g. tuition_monthly, books_annual, admission_one_time
    class_name TEXT,                  -- NULL = applies to all classes
    amount NUMERIC NOT NULL DEFAULT 0,
    academic_year TEXT NOT NULL,      -- e.g. "2024-2025"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 30. FEE TABLE (Ad-Hoc / Materialized Fee Templates)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    due_date DATE,
    fee_type TEXT DEFAULT 'Monthly',  -- Monthly, Annual, One-time, Ad-Hoc
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 31. STUDENT FEES (Mapping students to ad-hoc/materialized fees)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_fees (
    id BIGSERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    fee_id BIGINT NOT NULL REFERENCES public.fee(id) ON DELETE CASCADE,
    payment_status TEXT DEFAULT 'Unpaid', -- Unpaid, Paid, Partial
    total_paid_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 32. RECEIPTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.receipts (
    id BIGSERIAL PRIMARY KEY,
    receipt_number INTEGER NOT NULL,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    total_amount NUMERIC DEFAULT 0,
    payment_mode TEXT,                -- Cash, UPI, Bank Transfer, etc.
    remarks TEXT,
    collected_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 33. PAYMENTS LEDGER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments_ledger (
    id BIGSERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    receipt_id BIGINT REFERENCES public.receipts(id) ON DELETE SET NULL,
    fee_id BIGINT REFERENCES public.fee(id) ON DELETE SET NULL,
    amount_paid NUMERIC DEFAULT 0,
    payment_mode TEXT,
    remarks TEXT,
    collected_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 34. TRANSACTION CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,               -- INCOME, EXPENSE
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 35. TRANSACTIONS (Income/Expense ledger)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,               -- INCOME, EXPENSE
    category_id BIGINT REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    transaction_date DATE NOT NULL,
    description TEXT,
    payment_method TEXT,
    reference_number TEXT,
    logged_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 36. COURSE / ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT,
    class_id UUID REFERENCES public.class(id) ON DELETE CASCADE,
    chapter TEXT,
    duedate DATE,
    description TEXT,
    file_url TEXT,
    type TEXT DEFAULT 'assignment',   -- assignment, material, diary
    date DATE,
    day TEXT,
    topics_taught TEXT,
    unit TEXT,
    lesson_no TEXT,
    page_number TEXT,
    others TEXT,
    homework TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 37. COURSE SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_submissions (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (course_id, student_id)
);

-- ============================================================
-- 38. SCHOOL SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.school_settings (
    id BIGSERIAL PRIMARY KEY,
    instagram_url TEXT,
    whatsapp_url TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    facebook_url TEXT,
    youtube_url TEXT,
    website_url TEXT,
    late_fee_penalty NUMERIC DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 39. SCHOOL CHAMPIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.school_champions (
    id BIGSERIAL PRIMARY KEY,
    student_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    game_name TEXT,
    achievement_level TEXT,
    marks_score TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 40. SCHOOL GALLERY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.school_gallery (
    id BIGSERIAL PRIMARY KEY,
    image_url TEXT,                   -- legacy field
    title TEXT,
    description TEXT,
    media_type TEXT,                  -- image, video
    media_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 41. SCHOOL NEWSLETTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.school_newsletters (
    id BIGSERIAL PRIMARY KEY,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 42. CIRCULARS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.circulars (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    attachment_url TEXT,
    target_audience TEXT DEFAULT 'all', -- all, teachers, class
    class_id UUID REFERENCES public.class(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 43. THOUGHT OF THE DAY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thought_of_the_day (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    thought TEXT NOT NULL,
    author TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 44. SPOTLIGHT OF THE DAY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.spotlight_of_the_day (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 45. STUDENT OF THE WEEK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_of_the_week (
    id BIGSERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    reason TEXT,
    metrics JSONB,                    -- { attendance: x, grades: y, total: z }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 46. STAFF RESPONSIBILITIES (Roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_responsibilities (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    role_title TEXT NOT NULL,
    duties TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_type ON public."user"(type);
CREATE INDEX IF NOT EXISTS idx_user_email ON public."user"(email);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_exam_id ON public.grades(exam_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exams(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON public.class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_class_id ON public.class_teachers(class_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id ON public.class_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class_id ON public.timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_date ON public.timetable(date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_ledger_student_id ON public.payments_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_ledger_receipt_id ON public.payments_ledger(receipt_id);
CREATE INDEX IF NOT EXISTS idx_communication_sender_id ON public.communication(sender_id);
CREATE INDEX IF NOT EXISTS idx_communication_receiver_id ON public.communication(receiver_id);
CREATE INDEX IF NOT EXISTS idx_communication_type ON public.communication(type);
CREATE INDEX IF NOT EXISTS idx_fee_structures_academic_year ON public.fee_structures(academic_year);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_student_fees_student_id ON public.student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user_id ON public.user_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_fcm_token ON public.user_device_tokens(fcm_token);
CREATE INDEX IF NOT EXISTS idx_subject_teachers_teacher_id ON public.subject_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_teachers_class_id ON public.subject_teachers(class_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent_id ON public.student_parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_student_id ON public.student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_parent_id ON public.user_connections(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_student_id ON public.user_connections(student_id);
CREATE INDEX IF NOT EXISTS idx_event_consents_event_id ON public.event_consents(event_id);
CREATE INDEX IF NOT EXISTS idx_consent_responses_consent_id ON public.consent_responses(consent_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Basic Policies
-- Enable RLS on all tables but allow service_role full access
-- Your backend uses BOTH anon key and service_role key.
-- Since auth is handled by your Express middleware (not Supabase RLS),
-- we allow open read/write via anon for simplicity.
-- Tighten these if you want Supabase-native auth enforcement.
-- ============================================================

-- Enable RLS on key tables
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

-- Service role gets full access (bypasses RLS by default, but explicit is safer)
CREATE POLICY "Service role full access on user" ON public."user"
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on attendance" ON public.attendance
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on grades" ON public.grades
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on notifications" ON public.notifications
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on communication" ON public.communication
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on payments_ledger" ON public.payments_ledger
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on timetable" ON public.timetable
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on exams" ON public.exams
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on class" ON public.class
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on class_students" ON public.class_students
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on class_teachers" ON public.class_teachers
    FOR ALL USING (auth.role() = 'service_role');

-- Anon key gets open access (your backend handles auth via Express middleware)
CREATE POLICY "Anon full access on user" ON public."user"
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on attendance" ON public.attendance
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on grades" ON public.grades
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on notifications" ON public.notifications
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on communication" ON public.communication
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on payments_ledger" ON public.payments_ledger
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on timetable" ON public.timetable
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on exams" ON public.exams
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on class" ON public.class
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on class_students" ON public.class_students
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on class_teachers" ON public.class_teachers
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DONE! Schema is ready for The Arc School application.
-- ============================================================

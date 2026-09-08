-- ============================================================================
-- THE ARC SCHOOL ERP - MULTI-TENANT SAAS DATABASE SCHEMA
-- ============================================================================
-- Architecture: Multi-Tenant Shared Database with Row Level Security (RLS)
-- Supports: Super Admin Engine, School Tenant Autonomy, Sibling Management,
--           Academics, Admissions, Finance, Attendance, Portals & Mobile Apps.
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PLATFORM & MULTI-TENANCY CORE
-- ============================================================================

-- 1.1 Schools / Tenants Table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,                       -- e.g. 'ARCSCHOOL', 'GREENWOOD'
    subdomain TEXT UNIQUE NOT NULL,                  -- e.g. 'greenwood' -> greenwood.arcschool.cloud
    custom_domain TEXT UNIQUE,                      -- e.g. 'portal.greenwoodhigh.com'
    logo_url TEXT,
    favicon_url TEXT,
    address TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    currency TEXT DEFAULT 'INR',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    
    -- Subscription & Licensing
    subscription_plan TEXT DEFAULT 'standard',       -- 'starter', 'standard', 'pro', 'enterprise'
    subscription_status TEXT DEFAULT 'active',       -- 'trial', 'active', 'suspended', 'cancelled'
    max_students INTEGER DEFAULT 500,
    trial_ends_at TIMESTAMPTZ,
    subscription_renews_at TIMESTAMPTZ,
    
    -- Feature Modules Configuration (JSONB)
    modules_enabled JSONB DEFAULT '{
        "finance": true,
        "admissions": true,
        "transport": false,
        "live_chat": true,
        "attendance_biometric": false,
        "whatsapp_alerts": true,
        "sibling_discount": true,
        "online_exams": true,
        "homework_portal": true
    }'::jsonb,
    
    -- School Specific Branding & Accounting Config
    settings JSONB DEFAULT '{
        "receipt_prefix": "REC",
        "admission_prefix": "ADM",
        "academic_year": "2026-2027",
        "sibling_discount_pct": 10,
        "currency_symbol": "₹",
        "tax_percentage": 0,
        "late_fee_per_day": 0
    }'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Platform Super Admins Table
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'super_admin',                 -- 'super_admin', 'support_manager', 'billing_admin'
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Tenant Audit Log (Security & Action Tracking)
CREATE TABLE IF NOT EXISTS public.tenant_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,                           -- 'CREATE_STUDENT', 'COLLECT_FEE', 'PROVISION_SCHOOL'
    target_entity TEXT,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. SIBLING & FAMILY MANAGEMENT ENGINE
-- ============================================================================

-- 2.1 Parents Entity (Family Account)
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    father_name TEXT,
    mother_name TEXT,
    guardian_name TEXT,
    phone TEXT NOT NULL,                            -- Primary lookup phone for sibling auto-match
    alternate_number TEXT,
    email TEXT,
    address TEXT,
    occupation TEXT,
    annual_income TEXT,
    emergency_contact TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 Sibling Groups Entity (Unified Family grouping)
CREATE TABLE IF NOT EXISTS public.sibling_groups (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    primary_parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
    group_name TEXT,                                -- e.g. "Sharma Family"
    discount_percentage NUMERIC DEFAULT 0,          -- Sibling concession percentage
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. USERS, STAFF & ROLE MANAGEMENT
-- ============================================================================

-- 3.1 Unified Users Table (Students, Teachers, Admins, Staff, Principals, Accountants)
CREATE TABLE IF NOT EXISTS public."user" (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    password_hash TEXT,
    type TEXT DEFAULT 'student',                     -- 'student', 'teacher', 'admin', 'principal', 'accountant', 'admission_officer', 'parent', 'staff'
    gender TEXT,
    dob DATE,
    status TEXT DEFAULT 'active',                    -- 'active', 'inactive', 'suspended', 'alumni'
    avatar_url TEXT,
    address TEXT,
    
    -- Student Specific Attributes
    admission_number TEXT,
    admission_date DATE,
    house TEXT,
    father_name TEXT,
    mother_name TEXT,
    monthly_fee NUMERIC DEFAULT 0,
    bus_fee NUMERIC DEFAULT 0,
    bus_start_date DATE,
    fee_exempted BOOLEAN DEFAULT false,
    sibling_discount_pct NUMERIC DEFAULT 0,
    sibling_group_id UUID REFERENCES public.sibling_groups(id) ON DELETE SET NULL,
    form_submitted BOOLEAN DEFAULT false,
    leave_school BOOLEAN DEFAULT false,
    leave_date DATE,
    blood_group TEXT,
    national_id TEXT,                               -- e.g. Aadhaar / SSN for verification
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.2 Student-Parent Relationship Mapping (Many-to-Many with Sibling link)
CREATE TABLE IF NOT EXISTS public.student_parents (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    relationship TEXT DEFAULT 'father',              -- 'father', 'mother', 'guardian'
    is_primary_contact BOOLEAN DEFAULT true,
    is_fee_payer BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, parent_id, student_id)
);

-- 3.3 Staff Details & Qualifications
CREATE TABLE IF NOT EXISTS public.staff_details (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    designation TEXT,
    qualification TEXT,
    salary NUMERIC DEFAULT 0,
    joining_date DATE,
    contract_type TEXT DEFAULT 'permanent',          -- 'permanent', 'contractual', 'part_time'
    emergency_contact TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.4 Staff Administrative Responsibilities
CREATE TABLE IF NOT EXISTS public.staff_responsibilities (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_details(id) ON DELETE CASCADE,
    responsibility TEXT NOT NULL,                    -- e.g. "Examination Incharge", "Sports Coordinator"
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5 Teacher Details & Subjects Expertise
CREATE TABLE IF NOT EXISTS public.teacher_details (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    qualification TEXT,
    experience_years NUMERIC DEFAULT 0,
    specialization TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. ACADEMICS, CLASSES, SUBJECTS & TIMETABLE
-- ============================================================================

-- 4.1 Physical Rooms / Laboratories / Venues
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                              -- e.g. "Room 101", "Physics Lab", "Auditorium"
    building TEXT,
    floor TEXT,
    capacity INTEGER DEFAULT 40,
    room_type TEXT DEFAULT 'classroom',              -- 'classroom', 'lab', 'sports_ground', 'hall'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.2 Class and Sections
CREATE TABLE IF NOT EXISTS public.class (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                              -- e.g. "Grade 10", "Pre-Nursery"
    section TEXT DEFAULT 'A',                       -- 'A', 'B', 'C'
    stream TEXT,                                    -- 'Science', 'Commerce', 'Arts', 'General'
    academic_year TEXT NOT NULL,                    -- '2026-2027'
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.3 Subjects Master Catalog
CREATE TABLE IF NOT EXISTS public.subject (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                              -- "Mathematics", "English Literature"
    code TEXT,                                      -- "MATH101"
    type TEXT DEFAULT 'theory',                     -- 'theory', 'practical', 'elective'
    credits NUMERIC DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.4 Class-Subject Allocations
CREATE TABLE IF NOT EXISTS public.class_subjects (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subject(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, class_id, subject_id)
);

-- 4.5 Class Teacher Assignments
CREATE TABLE IF NOT EXISTS public.class_teachers (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, class_id, teacher_id, academic_year)
);

-- 4.6 Subject Teacher Assignments
CREATE TABLE IF NOT EXISTS public.subject_teachers (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subject(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.7 Student Class Enrollment Mapping
CREATE TABLE IF NOT EXISTS public.class_students (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    roll_number TEXT,
    academic_year TEXT NOT NULL,
    status TEXT DEFAULT 'active',                    -- 'active', 'transferred', 'promoted', 'detained'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, class_id, student_id, academic_year)
);

-- 4.8 Timetable Schedule
CREATE TABLE IF NOT EXISTS public.timetable (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subject(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    day_of_week TEXT NOT NULL,                       -- 'Monday', 'Tuesday', ...
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.9 Attendance (Students & Staff)
CREATE TABLE IF NOT EXISTS public.attendance (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.class(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL,                            -- 'present', 'absent', 'late', 'half_day', 'excused'
    remarks TEXT,
    recorded_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, user_id, date)
);

-- ============================================================================
-- 5. FINANCE, FEE STRUCTURES, LEDGERS & RECEIPTS
-- ============================================================================

-- 5.1 General Fee Master Catalog
CREATE TABLE IF NOT EXISTS public.fee (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    due_date DATE,
    fee_type TEXT DEFAULT 'Monthly',                 -- 'Monthly', 'Quarterly', 'Annual', 'One-time'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.2 Class-wise Fee Structures
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    fee_category TEXT NOT NULL,                      -- 'Tuition Fee', 'Transport Fee', 'Admission Fee', 'Lab Fee'
    class_name TEXT NOT NULL,                        -- 'Grade 10' or 'All'
    amount NUMERIC DEFAULT 0 NOT NULL,
    academic_year TEXT NOT NULL,
    due_frequency TEXT DEFAULT 'Monthly',            -- 'Monthly', 'Quarterly', 'Annual'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.3 Student Fee Demands & Allocations
CREATE TABLE IF NOT EXISTS public.student_fees (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    fee_structure_id BIGINT REFERENCES public.fee_structures(id) ON DELETE SET NULL,
    amount NUMERIC DEFAULT 0 NOT NULL,
    discount_amount NUMERIC DEFAULT 0,
    final_amount NUMERIC DEFAULT 0 NOT NULL,
    paid_amount NUMERIC DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'unpaid',                    -- 'unpaid', 'partial', 'paid', 'waived'
    due_date DATE,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.4 Official Fee Receipts
CREATE TABLE IF NOT EXISTS public.receipts (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,                    -- e.g. "REC-2026-0001"
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    total_amount NUMERIC DEFAULT 0 NOT NULL,
    payment_mode TEXT DEFAULT 'Cash',                -- 'Cash', 'UPI', 'NetBanking', 'Card', 'Cheque', 'Razorpay'
    payment_date TIMESTAMPTZ DEFAULT now(),
    collected_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    remarks TEXT,
    receipt_data JSONB,                              -- Detailed breakdown of items paid
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.5 Payments Ledger (Double-Entry Fee Tracking)
CREATE TABLE IF NOT EXISTS public.payments_ledger (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    receipt_id BIGINT REFERENCES public.receipts(id) ON DELETE CASCADE,
    fee_id BIGINT REFERENCES public.fee(id) ON DELETE SET NULL,
    amount_paid NUMERIC DEFAULT 0 NOT NULL,
    payment_mode TEXT DEFAULT 'Cash',
    transaction_reference TEXT,                     -- UTR / Gateway Order ID
    remarks TEXT,
    collected_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.6 School Expense & Income Categories
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                              -- 'Staff Salary', 'Electricity', 'Maintenance', 'Library Books'
    type TEXT NOT NULL,                              -- 'income', 'expense'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.7 General Accounting Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    amount NUMERIC DEFAULT 0 NOT NULL,
    type TEXT NOT NULL,                              -- 'income', 'expense'
    payment_mode TEXT DEFAULT 'Bank Transfer',
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    reference_number TEXT,
    created_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. EXAMINATIONS, ASSESSMENTS & GRADES
-- ============================================================================

-- 6.1 Grading Scales & Letter Grades
CREATE TABLE IF NOT EXISTS public.grading_scales (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    grade TEXT NOT NULL,                             -- 'A+', 'A', 'B', 'C', 'F'
    min_percentage NUMERIC NOT NULL,
    max_percentage NUMERIC NOT NULL,
    grade_point NUMERIC DEFAULT 0,
    color_hex TEXT DEFAULT '#000000',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6.2 Exams Master
CREATE TABLE IF NOT EXISTS public.exams (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                             -- 'Mid-Term Exam 2026', 'Final Annual Exam'
    class_id UUID REFERENCES public.class(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subject(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    max_marks NUMERIC DEFAULT 100,
    pass_marks NUMERIC DEFAULT 33,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6.3 Student Grade Records / Marksheet
CREATE TABLE IF NOT EXISTS public.grades (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    exam_id BIGINT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    marks NUMERIC DEFAULT 0,
    max_marks NUMERIC DEFAULT 100,
    grade TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, student_id, exam_id)
);

-- ============================================================================
-- 7. COURSEWORK, HOMEWORK, CIRCULARS & NOTICES
-- ============================================================================

-- 7.1 Coursework & Homework Assignments
CREATE TABLE IF NOT EXISTS public.course (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.class(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subject(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.2 Student Coursework Submissions
CREATE TABLE IF NOT EXISTS public.course_submissions (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_urls JSONB DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    marks NUMERIC,
    feedback TEXT,
    status TEXT DEFAULT 'submitted',                 -- 'submitted', 'graded', 'resubmit'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, course_id, student_id)
);

-- 7.3 School Circulars & Official Notices
CREATE TABLE IF NOT EXISTS public.circulars (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT DEFAULT 'all',              -- 'all', 'parents', 'teachers', 'students'
    file_url TEXT,
    published_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.4 Communication & Messaging
CREATE TABLE IF NOT EXISTS public.communication (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public."user"(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.class(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.5 Parent / Student Complaints & Grievances
CREATE TABLE IF NOT EXISTS public.complaints (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'general',                 -- 'academic', 'transport', 'finance', 'discipline', 'general'
    status TEXT DEFAULT 'open',                      -- 'open', 'in_progress', 'resolved', 'closed'
    priority TEXT DEFAULT 'normal',                  -- 'low', 'normal', 'high', 'urgent'
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7.6 Field Trips & Event Consents
CREATE TABLE IF NOT EXISTS public.consents (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date DATE,
    deadline DATE,
    fee_amount NUMERIC DEFAULT 0,
    created_by UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.7 Parent Consent Responses
CREATE TABLE IF NOT EXISTS public.consent_responses (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    consent_id BIGINT NOT NULL REFERENCES public.consents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',                   -- 'approved', 'rejected', 'pending'
    response_date TIMESTAMPTZ DEFAULT now(),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, consent_id, student_id)
);

-- 7.8 Annual School Calendar / Planner
CREATE TABLE IF NOT EXISTS public.annual_planner (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    event_type TEXT DEFAULT 'holiday',               -- 'holiday', 'exam', 'sports', 'celebration', 'meeting'
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. SCHOOL CULTURE, RECOGNITIONS & MEDIA
-- ============================================================================

-- 8.1 School Media Gallery
CREATE TABLE IF NOT EXISTS public.school_gallery (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Events',
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image',                 -- 'image', 'video'
    event_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8.2 School Magazines & Newsletters
CREATE TABLE IF NOT EXISTS public.school_newsletters (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    edition TEXT,
    file_url TEXT NOT NULL,
    publish_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8.3 Daily Inspirational Thoughts
CREATE TABLE IF NOT EXISTS public.thought_of_the_day (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    thought TEXT NOT NULL,
    author TEXT,
    display_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8.4 Spotlight of the Day
CREATE TABLE IF NOT EXISTS public.spotlight_of_the_day (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    student_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    display_date DATE DEFAULT CURRENT_DATE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8.5 Student of the Week
CREATE TABLE IF NOT EXISTS public.student_of_the_week (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    class_name TEXT,
    reason TEXT,
    week_start_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8.6 School Champions & Hall of Fame
CREATE TABLE IF NOT EXISTS public.school_champions (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    student_id UUID REFERENCES public."user"(id) ON DELETE CASCADE,
    category TEXT,                                   -- 'Academics', 'Sports', 'Arts', 'Robotics'
    achievement TEXT NOT NULL,
    year TEXT DEFAULT '2026',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8.7 Extra-Curricular Clubs & Activities
CREATE TABLE IF NOT EXISTS public.activities (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                              -- 'Robotics Club', 'Debate Society', 'Football'
    description TEXT,
    teacher_incharge UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    schedule TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 9. NOTIFICATIONS, FCM DEVICE TOKENS & REALTIME
-- ============================================================================

-- 9.1 Push & In-App Notification Logs
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'general',                     -- 'fee_reminder', 'attendance', 'homework', 'announcement'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9.2 Mobile Device Push Tokens (Firebase Cloud Messaging)
CREATE TABLE IF NOT EXISTS public.user_device_tokens (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    platform TEXT DEFAULT 'android',                 -- 'android', 'ios', 'web'
    last_updated TIMESTAMPTZ DEFAULT now(),
    UNIQUE(school_id, user_id, fcm_token)
);

-- 9.3 Socket.io Online Status & Connections
CREATE TABLE IF NOT EXISTS public.user_connections (
    id BIGSERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    socket_id TEXT NOT NULL,
    status TEXT DEFAULT 'online',
    last_seen TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 10. HIGH-PERFORMANCE COMPOSITE INDEXES
-- ============================================================================

-- School lookup indexes
CREATE INDEX IF NOT EXISTS idx_schools_subdomain ON public.schools(subdomain);
CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_custom_domain ON public.schools(custom_domain);

-- Multi-Tenant User Indexes
CREATE INDEX IF NOT EXISTS idx_user_school_type ON public."user"(school_id, type);
CREATE INDEX IF NOT EXISTS idx_user_school_phone ON public."user"(school_id, phone);
CREATE INDEX IF NOT EXISTS idx_user_school_admission ON public."user"(school_id, admission_number);
CREATE INDEX IF NOT EXISTS idx_user_sibling_group ON public."user"(school_id, sibling_group_id);

-- Sibling & Parent Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_parents_school_phone ON public.parents(school_id, phone);
CREATE INDEX IF NOT EXISTS idx_student_parents_lookup ON public.student_parents(school_id, parent_id, student_id);

-- Academics & Attendance
CREATE INDEX IF NOT EXISTS idx_class_students_enroll ON public.class_students(school_id, class_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON public.attendance(school_id, date, user_id);

-- Finance & Receipts
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON public.student_fees(school_id, student_id, status);
CREATE INDEX IF NOT EXISTS idx_receipts_student ON public.receipts(school_id, student_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_ledger_receipt ON public.payments_ledger(school_id, receipt_id, student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_school_date ON public.transactions(school_id, date, type);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(school_id, recipient_id, is_read, created_at DESC);

-- ============================================================================
-- 11. ROW-LEVEL SECURITY (RLS) HELPER FUNCTIONS & POLICIES
-- ============================================================================

-- Enable RLS on all tenant-isolated tables
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sibling_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circulars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to retrieve current school context from PostgreSQL session
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_school_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Generic Row Level Security Policies
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'user', 'parents', 'student_parents', 'sibling_groups',
        'class', 'class_students', 'attendance', 'fee', 'fee_structures',
        'student_fees', 'receipts', 'payments_ledger', 'transactions',
        'exams', 'grades', 'circulars', 'communication', 'notifications'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;
            CREATE POLICY tenant_isolation_policy ON public.%I
                FOR ALL
                USING (
                    school_id = public.current_school_id()
                    OR current_setting(''app.is_super_admin'', true) = ''true''
                );
        ', tbl, tbl);
    END LOOP;
END;
$$;

-- ============================================================================
-- 12. INITIAL SEED DATA (SUPER ADMIN & DEFAULT ARC SCHOOL)
-- ============================================================================

-- 12.1 Platform Super Admin Account
-- Default Email: admin@arcschool.cloud | Password: Password@123 (bcrypt hash)
INSERT INTO public.super_admins (name, email, password_hash, role)
VALUES (
    'Platform Super Admin',
    'admin@arcschool.cloud',
    '$2b$10$wT0o3s0n08mK.qK94B0yUu2sU7l05I7m9oXo1q8Fk3H9P1n0G7kKm',
    'super_admin'
)
ON CONFLICT (email) DO NOTHING;

-- 12.2 Initial School Record: The Arc School
INSERT INTO public.schools (
    name,
    code,
    subdomain,
    contact_email,
    contact_phone,
    address,
    subscription_plan,
    subscription_status,
    max_students
)
VALUES (
    'The Arc School',
    'ARCSCHOOL',
    'thearcschool',
    'contact@arcschool.cloud',
    '+91-9876543210',
    'Main Campus, Education Hub',
    'enterprise',
    'active',
    5000
)
ON CONFLICT (subdomain) DO NOTHING;

-- 12.3 Default Grading Scales
DO $$
DECLARE
    default_school_id UUID;
BEGIN
    SELECT id INTO default_school_id FROM public.schools WHERE subdomain = 'thearcschool' LIMIT 1;
    
    IF default_school_id IS NOT NULL THEN
        INSERT INTO public.grading_scales (school_id, grade, min_percentage, max_percentage, grade_point, color_hex)
        VALUES 
            (default_school_id, 'A+', 90, 100, 10, '#10b981'),
            (default_school_id, 'A',  80, 89.99, 9, '#3b82f6'),
            (default_school_id, 'B+', 70, 79.99, 8, '#6366f1'),
            (default_school_id, 'B',  60, 69.99, 7, '#f59e0b'),
            (default_school_id, 'C',  50, 59.99, 6, '#eab308'),
            (default_school_id, 'D',  33, 49.99, 4, '#f97316'),
            (default_school_id, 'F',   0, 32.99, 0, '#ef4444')
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

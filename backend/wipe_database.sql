-- ==============================================================
-- ⚠️ WIPE ALL DATA SCRIPT
-- ==============================================================
-- This script will:
-- 1. Delete all users from Supabase Auth (except the admin).
-- 2. Because of CASCADE relationships, this will also delete
--    their profiles from public.user.
-- 3. Truncate all classes, fees, transactions, and other 
--    school data to start completely fresh.
-- ==============================================================

-- 1. Delete everyone from auth.users EXCEPT the admin.
-- (This cascades to public."user", class_students, grades, etc.)
DELETE FROM auth.users 
WHERE id NOT IN (
    SELECT id FROM public."user" WHERE type = 'admin'
);

-- 2. Wipe School Data Tables
-- We use CASCADE to automatically wipe any dependent tables
TRUNCATE TABLE public.class CASCADE;
TRUNCATE TABLE public.fee CASCADE;
TRUNCATE TABLE public.transactions CASCADE;
TRUNCATE TABLE public.transaction_categories CASCADE;
TRUNCATE TABLE public.exams CASCADE;
TRUNCATE TABLE public.school_gallery CASCADE;
TRUNCATE TABLE public.school_newsletters CASCADE;
TRUNCATE TABLE public.public_holidays CASCADE;
TRUNCATE TABLE public.newUsers CASCADE;

-- Note: We are leaving public.school_settings and public.schoolInfo 
-- intact so the core application configuration remains.

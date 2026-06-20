-- ==============================================================
-- 🗑️ DELETE ALL STUDENTS SCRIPT
-- ==============================================================
-- This script safely deletes only the students from the database.
-- It preserves Admins, Teachers, and Parents, as well as school
-- settings, classes, and other structural data.
-- ==============================================================

-- Delete all users from auth.users who are marked as 'student' in public.user.
-- Because of CASCADE relationships, this will automatically:
-- 1. Delete their profiles from public.user
-- 2. Delete their class mappings from class_students
-- 3. Delete their fee records from student_fees
-- 4. Delete their grades, attendance, and course submissions.
DELETE FROM auth.users 
WHERE id IN (
    SELECT id FROM public."user" WHERE type = 'student'
);

-- Explicitly delete from public.user as well just in case CASCADE isn't enabled
DELETE FROM public."user" 
WHERE type = 'student';

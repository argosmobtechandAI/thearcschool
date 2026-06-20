-- ==============================================================
-- 🔧 FIX: Class Students & Teachers UUID Migration
-- ==============================================================
-- The `class` table was migrated to use UUID primary keys, but 
-- `class_students` and `class_teachers` were still expecting 
-- `class_id` to be a BIGINT. This caused the bulk upload and 
-- class assignment functions to fail silently.
-- ==============================================================

-- 1. Wipe old orphaned data that references integer class IDs
TRUNCATE TABLE public.class_students;
TRUNCATE TABLE public.class_teachers;

-- 2. Alter class_students to use UUID
ALTER TABLE public.class_students 
  DROP COLUMN class_id;

ALTER TABLE public.class_students 
  ADD COLUMN class_id UUID REFERENCES public.class(id) ON DELETE CASCADE;

-- 3. Alter class_teachers to use UUID
ALTER TABLE public.class_teachers 
  DROP COLUMN class_id;

ALTER TABLE public.class_teachers 
  ADD COLUMN class_id UUID REFERENCES public.class(id) ON DELETE CASCADE;

-- 4. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

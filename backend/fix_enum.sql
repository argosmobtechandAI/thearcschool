-- Fix the user type check constraint to include 'admission' 
-- This fixes the bug where Admission Counselors cannot be created due to DB trigger failure

-- 1. Drop the existing constraint
ALTER TABLE "public"."user" DROP CONSTRAINT IF EXISTS user_type_check;

-- 2. Add the new constraint with 'admission' included
ALTER TABLE "public"."user" ADD CONSTRAINT user_type_check CHECK (type IN ('admin', 'student', 'teacher', 'parent', 'finance', 'principal', 'admission'));

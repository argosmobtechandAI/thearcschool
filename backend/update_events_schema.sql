-- ==============================================================
-- 🚀 CLEANUP EVENTS TABLE (DROP VENUE IN FAVOR OF LOCATION)
-- ==============================================================

ALTER TABLE public.events DROP COLUMN IF EXISTS venue;

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

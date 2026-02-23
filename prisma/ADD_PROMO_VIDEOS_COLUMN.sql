-- ============================================================
-- FIX: "The column courses.promoVideos does not exist"
-- Run this ONCE in your PRODUCTION database (Supabase SQL Editor
-- or your DB provider's SQL console). Then redeploy/restart backend.
-- ============================================================

ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "promoVideos" JSONB;

-- After this, prisma.course.findMany() and all course queries will work again.
-- Your existing course rows are unchanged; only the new column is added.

-- Run in Supabase SQL Editor (or psql) ONCE before:
--   npx prisma migrate deploy
-- after switching to a single baseline migration.
--
-- WARNING: Deletes all application data in `public` (including _prisma_migrations).

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

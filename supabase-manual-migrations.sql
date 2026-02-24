-- =============================================================================
-- Run this in Supabase SQL Editor if Prisma migrate deploy hangs or times out.
-- Run each block separately if you prefer, or run all at once.
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks where possible).
-- =============================================================================

-- 1) CourseStatus enum: add UPCOMING_EVENTS (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'UPCOMING_EVENTS'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CourseStatus')
  ) THEN
    ALTER TYPE "CourseStatus" ADD VALUE 'UPCOMING_EVENTS';
  END IF;
END $$;

-- 2) Table: upcoming_event_bookings (for Book Now form)
CREATE TABLE IF NOT EXISTS "upcoming_event_bookings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "courseId" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "referralSource" VARCHAR(100),
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "upcoming_event_bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "upcoming_event_bookings_eventId_idx" ON "upcoming_event_bookings"("eventId");
CREATE INDEX IF NOT EXISTS "upcoming_event_bookings_courseId_idx" ON "upcoming_event_bookings"("courseId");
CREATE INDEX IF NOT EXISTS "upcoming_event_bookings_email_idx" ON "upcoming_event_bookings"("email");

-- Add foreign keys only if table was just created or constraints missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upcoming_event_bookings_eventId_fkey'
  ) THEN
    ALTER TABLE "upcoming_event_bookings"
      ADD CONSTRAINT "upcoming_event_bookings_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upcoming_event_bookings_courseId_fkey'
  ) THEN
    ALTER TABLE "upcoming_event_bookings"
      ADD CONSTRAINT "upcoming_event_bookings_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Table: affiliate_applications (for Become A Affiliate form)
CREATE TABLE IF NOT EXISTS "affiliate_applications" (
    "id" TEXT NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "dateOfBirth" VARCHAR(20),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "currentOccupation" VARCHAR(255),
    "hasAffiliateExperience" BOOLEAN NOT NULL DEFAULT false,
    "experienceDetails" TEXT,
    "occultKnowledge" VARCHAR(100),
    "occultOther" TEXT,
    "whyJoin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliate_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "affiliate_applications_email_idx" ON "affiliate_applications"("email");
CREATE INDEX IF NOT EXISTS "affiliate_applications_createdAt_idx" ON "affiliate_applications"("createdAt");

-- =============================================================================
-- After running this, mark migrations as applied so Prisma doesn't try again:
--   npx prisma migrate resolve --applied 20250224000000_add_course_status_upcoming_events
--   npx prisma migrate resolve --applied 20250224100000_add_upcoming_event_bookings
--   npx prisma migrate resolve --applied 20250225100000_add_affiliate_applications
-- =============================================================================

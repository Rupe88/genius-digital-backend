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

-- 4) Installment (EMI-style) support: enum + tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'InstallmentStatus'
  ) THEN
    CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "course_installment_plans" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "numberOfInstallments" INTEGER NOT NULL,
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "minAmountForPlan" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_installment_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "course_installment_plans_courseId_key" ON "course_installment_plans"("courseId");
CREATE INDEX IF NOT EXISTS "course_installment_plans_courseId_idx" ON "course_installment_plans"("courseId");
CREATE INDEX IF NOT EXISTS "course_installment_plans_isActive_idx" ON "course_installment_plans"("isActive");

CREATE TABLE IF NOT EXISTS "course_installments" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_installments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "course_installments_enrollmentId_idx" ON "course_installments"("enrollmentId");
CREATE INDEX IF NOT EXISTS "course_installments_status_idx" ON "course_installments"("status");
CREATE INDEX IF NOT EXISTS "course_installments_dueDate_idx" ON "course_installments"("dueDate");
CREATE INDEX IF NOT EXISTS "course_installments_paymentId_idx" ON "course_installments"("paymentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_installment_plans_courseId_fkey') THEN
    ALTER TABLE "course_installment_plans"
      ADD CONSTRAINT "course_installment_plans_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_installments_enrollmentId_fkey') THEN
    ALTER TABLE "course_installments"
      ADD CONSTRAINT "course_installments_enrollmentId_fkey"
      FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_installments_paymentId_fkey') THEN
    ALTER TABLE "course_installments"
      ADD CONSTRAINT "course_installments_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- After running this, mark migrations as applied so Prisma doesn't try again:
--   npx prisma migrate resolve --applied 20250224000000_add_course_status_upcoming_events
--   npx prisma migrate resolve --applied 20250224100000_add_upcoming_event_bookings
--   npx prisma migrate resolve --applied 20250225100000_add_affiliate_applications
--   npx prisma migrate resolve --applied 20250226000000_add_installments
-- =============================================================================

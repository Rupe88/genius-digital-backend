-- Manual migration for partial access feature
-- Add new columns to enrollments table

-- Add EXPIRED status to enum (PostgreSQL doesn't support altering enums easily, so we'll handle this in application logic)

-- Add new columns to enrollments table
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS access_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS price_paid DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS granted_by_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add index for access expiration tracking
CREATE INDEX IF NOT EXISTS idx_enrollments_access_expires_at ON enrollments(access_expires_at);

-- Add comments for documentation
COMMENT ON COLUMN enrollments.access_type IS 'Type of access: FULL, PARTIAL, TRIAL';
COMMENT ON COLUMN enrollments.access_expires_at IS 'When the access expires for partial/trial access';
COMMENT ON COLUMN enrollments.price_paid IS 'Amount actually paid for this access';
COMMENT ON COLUMN enrollments.granted_by_admin IS 'If this access was granted by admin manually';
COMMENT ON COLUMN enrollments.admin_notes IS 'Admin notes for partial access grants';

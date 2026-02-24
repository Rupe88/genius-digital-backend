/**
 * One-time script: add 'UPCOMING_EVENTS' to CourseStatus enum in PostgreSQL.
 * Run if migrate deploy fails with "cannot run inside a transaction block":
 *   node scripts/add-upcoming-events-enum.js
 * Or run the SQL in Supabase SQL Editor:
 *   ALTER TYPE "CourseStatus" ADD VALUE 'UPCOMING_EVENTS';
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('ALTER TYPE "CourseStatus" ADD VALUE \'UPCOMING_EVENTS\'');
  console.log('SUCCESS: CourseStatus enum now includes UPCOMING_EVENTS.');
}

main()
  .catch((e) => {
    if (e.message?.includes('already exists') || e.code === 'duplicate_object') {
      console.log('UPCOMING_EVENTS already in CourseStatus – nothing to do.');
      process.exit(0);
    }
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

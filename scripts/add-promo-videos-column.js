/**
 * One-time script: add "promoVideos" column to courses table.
 * Run from backend root with production .env (or set DATABASE_URL):
 *   node scripts/add-promo-videos-column.js
 * Fixes: "The column courses.promoVideos does not exist in the current database"
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "promoVideos" JSONB;
    `);
    console.log('SUCCESS: Column "promoVideos" added to table "courses" (or already existed).');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

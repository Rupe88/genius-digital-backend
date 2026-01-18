import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...\n');

  // 1. ADMIN USER
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sanskaracademy.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Admin user ready');

  // 2. CATEGORIES
  const categories = [
    { name: 'Vastu Shastra', slug: 'vastu-shastra', type: 'COURSE' },
    { name: 'Numerology', slug: 'numerology', type: 'COURSE' },
    { name: 'Astrology', slug: 'astrology', type: 'COURSE' },
    { name: 'Vastu Items', slug: 'vastu-items', type: 'PRODUCT' },
    { name: 'Yantras', slug: 'yantras', type: 'PRODUCT' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log('✅ Categories seeded');

  // 3. INSTRUCTOR
  const instructor = await prisma.instructor.upsert({
    where: { slug: 'acharya-raja-babu-shah' },
    update: {},
    create: {
      name: 'Acharya Raja Babu Shah',
      slug: 'acharya-raja-babu-shah',
      designation: 'Top Vastulogist in Nepal',
      bio: 'ISO Certified Institute Founder with 15+ years experience.',
      email: 'contact@sanskaracademy.com',
      featured: true,
    },
  });
  console.log('✅ Instructor ready');

  // 4. COURSE: 7 Days Basic Vastu
  const catVastu = await prisma.category.findUnique({ where: { slug: 'vastu-shastra' } });
  const vastuCourse = await prisma.course.upsert({
    where: { slug: '7-days-basic-vastu-course' },
    update: {},
    create: {
      title: '7 DAYS BASIC VASTU COURSE',
      slug: '7-days-basic-vastu-course',
      shortDescription: 'Transform your home with ancient wisdom.',
      price: 399,
      originalPrice: 4000,
      status: 'PUBLISHED',
      level: 'Beginner',
      instructorId: instructor.id,
      categoryId: catVastu?.id,
      tags: 'Vastu,Basic,Home',
    },
  });
  console.log('✅ Basic Vastu Course ready');

  // 5. CHAPTERS & LESSONS (Basic Loop)
  const chapters = [
    { title: 'Day 1: Intro to Vastu', slug: 'day-1', order: 1 },
    { title: 'Day 2: Directions', slug: 'day-2', order: 2 },
  ];

  for (const ch of chapters) {
    const chapter = await prisma.chapter.upsert({
      where: { courseId_slug: { courseId: vastuCourse.id, slug: ch.slug } },
      update: ch,
      create: { ...ch, courseId: vastuCourse.id },
    });

    await prisma.lesson.upsert({
      where: { courseId_slug: { courseId: vastuCourse.id, slug: `${ch.slug}-lesson` } },
      update: {},
      create: {
        title: `${ch.title} Lesson`,
        slug: `${ch.slug}-lesson`,
        content: 'Content for ' + ch.title,
        lessonType: 'VIDEO',
        chapterId: chapter.id,
        courseId: vastuCourse.id,
      },
    });
  }
  console.log('✅ Chapters/Lessons ready');

  // 6. TESTIMONIALS
  await prisma.testimonial.upsert({
    where: { id: 'test-1' }, // Dummy ID for seed
    update: {},
    create: {
      id: 'test-1',
      name: 'Ram Sharma',
      comment: 'Life changing course!',
      rating: 5,
      designation: 'Architect',
      isPublished: true,
    },
  });

  // 7. EVENTS (FIXED FIELDS)
  await prisma.event.upsert({
    where: { slug: 'free-camp-2026' },
    update: {},
    create: {
      title: 'Free Vastu Consultation Camp',
      slug: 'free-camp-2026',
      startDate: new Date('2026-02-15T10:00:00'),
      isFree: true,
      venue: 'Kathmandu',
      maxAttendees: 50,
      status: 'UPCOMING',
    },
  });

  // 8. PRODUCTS
  const catItems = await prisma.category.findUnique({ where: { slug: 'vastu-items' } });
  await prisma.product.upsert({
    where: { slug: 'vastu-pyramid' },
    update: {},
    create: {
      name: 'Vastu Pyramid',
      slug: 'vastu-pyramid',
      price: 1499,
      images: ['https://example.com/img.jpg'],
      categoryId: catItems?.id,
      status: 'ACTIVE',
    },
  });

  // 9. LIVE CLASSES (FIXED FIELDS)
  await prisma.liveClass.create({
    data: {
      title: 'Weekly Q&A',
      scheduledAt: new Date('2026-01-25T18:00:00'),
      duration: 60,
      meetingProvider: 'ZOOM',
      instructorId: instructor.id,
      courseId: vastuCourse.id,
    },
  });

  console.log('\n✨ Seed completed successfully! ✨');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...\n');

  // 1. ADMIN USER
  // We force update the password to ensure the user can log in after seeding
  const adminEmail = process.env.ADMIN_EMAIL || 'geniusdigi@lms.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Geniusdigi@123!';

  console.log(`🔐 Setting up admin: ${adminEmail}`);
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword, // Resetting password to ensure login works
      fullName: 'Admin User',
      role: 'ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Admin user ready and password updated');

  // 2. CATEGORIES
  console.log('📂 Seeding categories...');
  const categories = [
    // Course Categories
    { name: 'Vastu Shastra', slug: 'vastu-shastra', description: 'Ancient science of architecture', type: 'COURSE' },
    { name: 'Numerology', slug: 'numerology', description: 'Power of numbers', type: 'COURSE' },
    { name: 'Astrology', slug: 'astrology', description: 'Vedic astrology', type: 'COURSE' },
    { name: 'Medical Astrology', slug: 'medical-astrology', description: 'Planetary health influences', type: 'COURSE' },
    // Product Categories
    { name: 'Vastu Items', slug: 'vastu-items', description: 'Remedies for home', type: 'PRODUCT' },
    { name: 'Yantras', slug: 'yantras', description: 'Sacred geometry', type: 'PRODUCT' },
    { name: 'Crystals', slug: 'crystals', description: 'Healing crystals', type: 'PRODUCT' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log(`✅ ${categories.length} categories seeded`);

  // 3. INSTRUCTOR
  console.log('👨‍🏫 Seeding instructor...');
  const instructor = await prisma.instructor.upsert({
    where: { slug: 'acharya-raja-babu-shah' },
    update: {
      designation: 'Top Vastulogist in Nepal | NLP Master Trainer',
      bio: "Led by Acharya Raja Babu Shah, Nepal's most trusted Vastu professional coach and the founder of Nepal's 1st ISO Certified Institute in Vastu, Numerology & Astrology.",
    },
    create: {
      name: 'Acharya Raja Babu Shah',
      slug: 'acharya-raja-babu-shah',
      designation: 'Top Vastulogist in Nepal | NLP Master Trainer',
      bio: "Led by Acharya Raja Babu Shah, Nepal's most trusted Vastu professional coach and the founder of Nepal's 1st ISO Certified Institute in Vastu, Numerology & Astrology.",
      email: 'contact@sanskaracademy.com',
      featured: true,
    },
  });
  console.log('✅ Instructor ready');

  // 4. COURSE: 7 Days Basic Vastu
  console.log('📚 Seeding courses...');
  const catVastu = await prisma.category.findUnique({ where: { slug: 'vastu-shastra' } });
  const vastuCourse = await prisma.course.upsert({
    where: { slug: '7-days-basic-vastu-course' },
    update: {
      price: 399,
      originalPrice: 4000,
      status: 'PUBLISHED',
      featured: true,
    },
    create: {
      title: '7 DAYS BASIC VASTU COURSE',
      slug: '7-days-basic-vastu-course',
      shortDescription: 'Transform your home with ancient wisdom. Learn from Nepal\'s Best.',
      price: 399,
      originalPrice: 4000,
      status: 'PUBLISHED',
      level: 'Beginner',
      instructorId: instructor.id,
      categoryId: catVastu?.id,
      tags: 'Vastu,Basic,Home,Nepal',
      videoUrl: 'https://www.youtube.com/watch?v=0_u6e6W7C5I',
      featured: true,
    },
  });
  console.log('✅ Basic Vastu Course seeded');

  // 5. CHAPTERS & LESSONS (All 7 Days)
  console.log('📖 Seeding full curriculum...');
  const days = [
    { title: 'Day 1: What is Scientific Vastu?', slug: 'day-1' },
    { title: 'Day 2: 5 Elements & 16 Directions', slug: 'day-2' },
    { title: 'Day 3: Entrance Analysis', slug: 'day-3' },
    { title: 'Day 4: Brahamsthan & Energy Points', slug: 'day-4' },
    { title: 'Day 5: Bedroom & Sleeping Directions', slug: 'day-5' },
    { title: 'Day 6: Toilet & Kitchen Vastu', slug: 'day-6' },
    { title: 'Day 7: Remedial Vastu (No Demolition)', slug: 'day-7' },
  ];

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const chapter = await prisma.chapter.upsert({
      where: { courseId_slug: { courseId: vastuCourse.id, slug: day.slug } },
      update: { order: i + 1 },
      create: {
        title: day.title,
        slug: day.slug,
        order: i + 1,
        courseId: vastuCourse.id
      },
    });

    // Add 2 lessons per day
    for (let l = 1; l <= 2; l++) {
      await prisma.lesson.upsert({
        where: { courseId_slug: { courseId: vastuCourse.id, slug: `${day.slug}-lesson-${l}` } },
        update: {},
        create: {
          title: `${day.title} - Part ${l}`,
          slug: `${day.slug}-lesson-${l}`,
          content: `In this section, we cover details of ${day.title}.`,
          lessonType: 'VIDEO',
          order: l,
          chapterId: chapter.id,
          courseId: vastuCourse.id,
        },
      });
    }
  }
  console.log('✅ Full 7-day curriculum seeded');

  // 6. TESTIMONIALS
  console.log('⭐ Seeding testimonials...');
  const testimonials = [
    { name: 'Sushil Shrestha', comment: 'Amazing insights into Vastu!', rating: 5, designation: 'Architect' },
    { name: 'Anita Pradhan', comment: 'The best investment for my home.', rating: 5, designation: 'Business Owner' }
  ];

  for (const t of testimonials) {
    await prisma.testimonial.upsert({
      where: { id: t.name.toLowerCase().replace(/ /g, '-') },
      update: t,
      create: {
        id: t.name.toLowerCase().replace(/ /g, '-'),
        ...t,
        isPublished: true,
        featured: true,
      }
    });
  }

  // 7. EVENTS
  console.log('📅 Seeding events...');
  await prisma.event.upsert({
    where: { slug: 'free-camp-2026' },
    update: {},
    create: {
      title: 'Free Vastu Consultation Camp 2026',
      slug: 'free-camp-2026',
      startDate: new Date('2026-03-15T10:00:00'),
      isFree: true,
      venue: 'Sanskar Academy Hall, Kathmandu',
      maxAttendees: 100,
      status: 'UPCOMING',
      featured: true,
    },
  });

  // 8. CONSULTATION CATEGORIES
  console.log('📋 Seeding consultation categories...');
  const consultationCategories = [
    { name: 'Business', slug: 'business', order: 1, image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600' },
    { name: 'Career', slug: 'career', order: 2, image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600' },
    { name: 'Vastu', slug: 'vastu', order: 3, image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600' },
    { name: 'Numerology', slug: 'numerology', order: 4, image: 'https://images.unsplash.com/photo-1518495978642-83e6f612a6ad?w=600' },
    { name: 'Astrology', slug: 'astrology', order: 5, image: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=600' },
    { name: 'Relationship', slug: 'relationship', order: 6, image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600' },
    { name: 'Health & Wellness', slug: 'health-wellness', order: 7, image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600' },
    { name: 'Other', slug: 'other', order: 8, image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600' },
  ];
  for (const cat of consultationCategories) {
    await prisma.consultationCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, image: cat.image, order: cat.order },
      create: { name: cat.name, slug: cat.slug, image: cat.image, order: cat.order, isActive: true },
    });
  }
  console.log(`✅ ${consultationCategories.length} consultation categories seeded`);

  // 9. PRODUCTS
  console.log('🛍️ Seeding products...');
  const catItems = await prisma.category.findUnique({ where: { slug: 'vastu-items' } });
  await prisma.product.upsert({
    where: { slug: 'vastu-pyramid-set' },
    update: {},
    create: {
      name: 'Professional Vastu Pyramid Set',
      slug: 'vastu-pyramid-set',
      price: 2500,
      description: 'High quality copper pyramids for home energy correction.',
      images: ['https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=800'],
      categoryId: catItems?.id,
      status: 'ACTIVE',
      featured: true,
      stock: 50,
    },
  });

  // 10. FAQs
  console.log('❓ Seeding FAQs...');
  const faqs = [
    {
      question: 'What is Vastu Shastra and how can it benefit my home?',
      answer: 'Vastu Shastra is an ancient Indian science of architecture and design that harmonizes living spaces with natural forces. It helps create positive energy flow, improves health and well-being, enhances prosperity, and brings peace and harmony to your home. By aligning your space with the five elements (earth, water, fire, air, and space) and directional energies, Vastu can significantly improve your quality of life.',
      category: 'GENERAL',
      order: 1,
    },
    {
      question: 'Do I need to demolish my existing home to apply Vastu principles?',
      answer: 'No, you don\'t need to demolish your home! Modern Vastu uses remedial solutions that work without any structural changes. We use Vastu remedies like pyramids, yantras, crystals, mirrors, and color corrections to balance the energy in your space. These remedies are effective, affordable, and can be implemented without any demolition or major renovations.',
      category: 'GENERAL',
      order: 2,
    },
    {
      question: 'What courses do you offer for learning Vastu?',
      answer: 'We offer comprehensive Vastu courses ranging from basic to advanced levels. Our flagship course is the "7 Days Basic Vastu Course" which covers fundamental principles, five elements, directions, entrance analysis, bedroom and kitchen Vastu, and remedial solutions. We also offer advanced courses for those who want to become professional Vastu consultants. All courses are taught by Acharya Raja Babu Shah, Nepal\'s top Vastu expert.',
      category: 'COURSES',
      order: 1,
    },
    {
      question: 'How long does it take to complete a Vastu course?',
      answer: 'Our basic Vastu course is designed as a 7-day program, but you can learn at your own pace. The course includes video lessons, practical exercises, and downloadable materials. Advanced courses vary in duration. All courses provide lifetime access, so you can revisit the content anytime. We recommend dedicating 1-2 hours per day for optimal learning.',
      category: 'COURSES',
      order: 2,
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept multiple payment methods including credit/debit cards, digital wallets, bank transfers, and cash on delivery (for products). We also support installment payments for higher-value courses. All transactions are secure and encrypted. For international students, we accept payments through PayPal and international bank transfers.',
      category: 'PAYMENTS',
      order: 1,
    },
    {
      question: 'Are your courses refundable?',
      answer: 'Yes, we offer a 7-day money-back guarantee for all courses. If you\'re not satisfied with the course content or teaching quality, you can request a full refund within 7 days of enrollment. However, once you\'ve completed more than 50% of the course, the refund policy may not apply. Please contact our support team for refund requests.',
      category: 'PAYMENTS',
      order: 2,
    },
    {
      question: 'How do I enroll in a Vastu course?',
      answer: 'Enrolling is simple! Browse our courses page, select the course you\'re interested in, click "Enroll Now", and complete the payment. Once payment is confirmed, you\'ll receive instant access to the course materials. You can start learning immediately from your dashboard. If you need assistance, our support team is available to help you through the enrollment process.',
      category: 'ENROLLMENT',
      order: 1,
    },
    {
      question: 'Do I need any prior knowledge to learn Vastu?',
      answer: 'No prior knowledge is required! Our courses are designed for beginners and start from the fundamentals. Whether you\'re a complete beginner or someone with basic knowledge, our structured curriculum will guide you step by step. The courses include practical examples, case studies, and hands-on exercises to help you understand and apply Vastu principles effectively.',
      category: 'ENROLLMENT',
      order: 2,
    },
    {
      question: 'I\'m having trouble accessing my course. What should I do?',
      answer: 'If you\'re experiencing technical issues, first try clearing your browser cache and cookies, then log out and log back in. Ensure you\'re using a modern browser (Chrome, Firefox, Safari, or Edge) with JavaScript enabled. If the problem persists, contact our technical support team with details about the issue, your device, and browser. We typically respond within 24 hours and can help resolve most issues quickly.',
      category: 'TECHNICAL',
      order: 1,
    },
    {
      question: 'Can I access courses on mobile devices?',
      answer: 'Yes! Our platform is fully responsive and works on all devices including smartphones and tablets. You can access your courses, watch videos, download materials, and track your progress from any device with an internet connection. We recommend using the latest version of your mobile browser for the best experience. Some features may vary slightly on mobile, but all core functionality is available.',
      category: 'TECHNICAL',
      order: 2,
    },
  ];

  for (const faq of faqs) {
    // Check if FAQ with same question exists
    const existing = await prisma.fAQ.findFirst({
      where: { question: faq.question },
    });

    if (existing) {
      // Update existing FAQ
      await prisma.fAQ.update({
        where: { id: existing.id },
        data: {
          answer: faq.answer,
          category: faq.category,
          order: faq.order,
          isActive: true,
        },
      });
    } else {
      // Create new FAQ
      await prisma.fAQ.create({
        data: {
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          order: faq.order,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ ${faqs.length} FAQs seeded`);

  // Limiting Belief Check (dynamic questionnaire) — seed once if empty
  const lbSectionCount = await prisma.limitingBeliefSection.count().catch(() => -1);
  if (lbSectionCount === 0) {
    console.log('🧠 Seeding Limiting Belief sections, questions, and score bands...');
    const bands = [
      { minScore: 0, maxScore: 49, label: 'Low Limiting Belief ✅', description: null, sortOrder: 0, isActive: true },
      { minScore: 50, maxScore: 74, label: 'Awareness Stage 🔄', description: null, sortOrder: 1, isActive: true },
      { minScore: 75, maxScore: 99, label: 'Moderate Limitation ⚠️', description: null, sortOrder: 2, isActive: true },
      { minScore: 100, maxScore: 125, label: 'Strong Limiting Belief System 🚨', description: null, sortOrder: 3, isActive: true },
    ];
    await prisma.limitingBeliefScoreBand.createMany({ data: bands });

    const sectionDefs = [
      {
        title: 'SECTION A – Self-Limitation Belief',
        sortOrder: 0,
        questions: [
          'म आफूलाई अरूभन्दा कम capable मान्छु',
          'म ठूलो success achieve गर्न सक्दिन जस्तो लाग्छ',
          'म आफ्नो decision मा doubt गर्छु',
          'म आफ्नो potential fully use गर्न सक्दिन',
          'म challenge बाट avoid गर्छु',
        ],
      },
      {
        title: 'SECTION B – Fear-Based Belief',
        sortOrder: 1,
        questions: [
          'म failure को डरले action लिन ढिलो गर्छु',
          'म risk लिन डराउँछु',
          'म अरूको judgement बाट डराउँछु',
          'म गल्ती हुनबाट बच्न धेरै सोचिरहन्छु',
          'म नयाँ opportunity लिन hesitate गर्छु',
        ],
      },
      {
        title: 'SECTION C – Money Limiting Belief',
        sortOrder: 2,
        questions: [
          'पैसा कमाउन धेरै गाह्रो हुन्छ भन्ने लाग्छ',
          'म ठूलो income deserve गर्दिन भन्ने लाग्छ',
          'पैसा कमाउँदा risk धेरै हुन्छ भन्ने लाग्छ',
          'म financial growth मा limited छु भन्ने लाग्छ',
          'म पैसा manage गर्न सक्दिन',
        ],
      },
      {
        title: 'SECTION D – Growth Limiting Belief',
        sortOrder: 3,
        questions: [
          'म change गर्न गाह्रो हुन्छ भन्ने लाग्छ',
          'म नयाँ skill सिक्न सक्दिन भन्ने लाग्छ',
          'म comfort zone बाट बाहिर जान सक्दिन',
          'म slow learner हुँ भन्ने लाग्छ',
          'म life मा धेरै improve गर्न सक्दिन',
        ],
      },
      {
        title: 'SECTION E – Action Limiting Belief',
        sortOrder: 4,
        questions: [
          'म काम सुरु गर्न ढिलो गर्छु',
          'म consistent रहन सक्दिन',
          'म discipline maintain गर्न सक्दिन',
          'म काम पूरा गर्न गाह्रो हुन्छ',
          'म motivation बिना action लिन सक्दिन',
        ],
      },
    ];

    for (let si = 0; si < sectionDefs.length; si++) {
      const def = sectionDefs[si];
      const section = await prisma.limitingBeliefSection.create({
        data: {
          title: def.title,
          sortOrder: def.sortOrder,
          isActive: true,
        },
      });
      for (let qi = 0; qi < def.questions.length; qi++) {
        await prisma.limitingBeliefQuestion.create({
          data: {
            sectionId: section.id,
            text: def.questions[qi],
            sortOrder: qi,
            isActive: true,
          },
        });
      }
    }
    console.log('✅ Limiting Belief questionnaire seeded (25 questions, 5 sections, 4 score bands)');
  } else if (lbSectionCount > 0) {
    console.log('⏭️  Limiting Belief data already present, skipping seed');
  } else {
    console.log('⏭️  Limiting Belief tables not available yet (run migrations), skipping seed');
  }

  console.log('\n✨ Seed completed successfully! ✨');
  console.log(`🔑 Admin Login: ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

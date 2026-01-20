/**
 * Script to publish all courses in production database
 * Run this to allow all courses to be shareable via referral links
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function publishAllCourses() {
    console.log('📚 Publishing all courses...\n');

    // Get all unpublished courses
    const unpublishedCourses = await prisma.course.findMany({
        where: {
            status: {
                not: 'PUBLISHED'
            }
        },
        select: {
            id: true,
            title: true,
            slug: true,
            status: true
        }
    });

    console.log(`Found ${unpublishedCourses.length} unpublished courses:\n`);

    for (const course of unpublishedCourses) {
        console.log(`  - ${course.title} (${course.slug}) - Current status: ${course.status}`);
    }

    if (unpublishedCourses.length === 0) {
        console.log('\n✅ All courses are already published!');
        return;
    }

    // Update all courses to PUBLISHED
    const result = await prisma.course.updateMany({
        where: {
            status: {
                not: 'PUBLISHED'
            }
        },
        data: {
            status: 'PUBLISHED'
        }
    });

    console.log(`\n✅ Successfully published ${result.count} courses!`);

    // Verify
    const allPublished = await prisma.course.count({
        where: {
            status: 'PUBLISHED'
        }
    });

    const totalCourses = await prisma.course.count();

    console.log(`\n📊 Status: ${allPublished}/${totalCourses} courses are now PUBLISHED`);
}

publishAllCourses()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { prisma } from '../config/database.js';



/**
 * Check if user can access a lesson
 * @param {string} userId - User ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<{canAccess: boolean, reason?: string, unlockedLessons?: string[]}>}
 */
export const checkLessonAccess = async (userId, lessonId) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          include: {
            enrollments: {
              where: {
                userId,
                status: 'ACTIVE',
              },
            },
          },
        },
        chapter: true,
      },
    });

    if (!lesson) {
      return { canAccess: false, reason: 'Lesson not found' };
    }

    // Preview lessons/chapters are always accessible
    if (lesson.isPreview || lesson.chapter?.isPreview) {
      return { canAccess: true };
    }

    // Check if user is enrolled
    const isEnrolled = lesson.course.enrollments && lesson.course.enrollments.length > 0;
    if (!isEnrolled) {
      return { canAccess: false, reason: 'You must be enrolled in this course' };
    }

    // Check manual lock
    if (lesson.isLocked || lesson.chapter?.isLocked) {
      return { canAccess: false, reason: 'This lesson is locked' };
    }

    // Check prerequisites (unlock requirements)
    if (lesson.unlockRequirement) {
      const prerequisites = Array.isArray(lesson.unlockRequirement)
        ? lesson.unlockRequirement
        : [lesson.unlockRequirement];

      // Check if all prerequisite lessons are completed
      const completedLessons = await prisma.lessonProgress.findMany({
        where: {
          userId,
          lessonId: { in: prerequisites },
          isCompleted: true,
        },
        select: {
          lessonId: true,
        },
      });

      const completedLessonIds = completedLessons.map(p => p.lessonId);
      const missingPrerequisites = prerequisites.filter(
        reqId => !completedLessonIds.includes(reqId)
      );

      if (missingPrerequisites.length > 0) {
        return {
          canAccess: false,
          reason: 'Complete prerequisite lessons first',
          missingPrerequisites,
        };
      }
    }

    // Check if previous lessons in the same chapter/course are completed (if sequential unlock is enabled)
    // This can be customized based on business logic

    return { canAccess: true };
  } catch (error) {
    console.error('Error checking lesson access:', error);
    return { canAccess: false, reason: 'Error checking access' };
  }
};

/**
 * Get all unlocked lessons for a user in a course
 * @param {string} userId - User ID
 * @param {string} courseId - Course ID
 * @returns {Promise<string[]>} - Array of unlocked lesson IDs
 */
export const getUnlockedLessons = async (userId, courseId) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        chapters: {
          include: {
            lessons: true,
          },
        },
        lessons: {
          where: {
            chapterId: null,
          },
        },
        enrollments: {
          where: {
            userId,
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!course) {
      return [];
    }

    const isEnrolled = course.enrollments && course.enrollments.length > 0;
    const unlockedLessonIds = [];

    // Get completed lesson IDs
    const completedProgress = await prisma.lessonProgress.findMany({
      where: {
        userId,
        isCompleted: true,
      },
      select: {
        lessonId: true,
      },
    });

    const completedLessonIds = new Set(completedProgress.map(p => p.lessonId));

    // Check all lessons
    const allLessons = [
      ...course.lessons,
      ...course.chapters.flatMap(chapter => chapter.lessons),
    ];

    for (const lesson of allLessons) {
      // Preview lessons are always unlocked
      if (lesson.isPreview || lesson.chapter?.isPreview) {
        unlockedLessonIds.push(lesson.id);
        continue;
      }

      // Must be enrolled
      if (!isEnrolled) {
        continue;
      }

      // Check manual lock
      if (lesson.isLocked || lesson.chapter?.isLocked) {
        continue;
      }

      // Check prerequisites
      if (lesson.unlockRequirement) {
        const prerequisites = Array.isArray(lesson.unlockRequirement)
          ? lesson.unlockRequirement
          : [lesson.unlockRequirement];

        const allPrerequisitesMet = prerequisites.every(reqId =>
          completedLessonIds.has(reqId)
        );

        if (!allPrerequisitesMet) {
          continue;
        }
      }

      unlockedLessonIds.push(lesson.id);
    }

    return unlockedLessonIds;
  } catch (error) {
    console.error('Error getting unlocked lessons:', error);
    return [];
  }
};

/**
 * Check if prerequisites are met for a lesson
 * @param {string} lessonId - Lesson ID
 * @param {string} userId - User ID
 * @returns {Promise<{met: boolean, missing?: string[]}>}
 */
export const checkPrerequisites = async (lessonId, userId) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        unlockRequirement: true,
      },
    });

    if (!lesson || !lesson.unlockRequirement) {
      return { met: true };
    }

    const prerequisites = Array.isArray(lesson.unlockRequirement)
      ? lesson.unlockRequirement
      : [lesson.unlockRequirement];

    const completedLessons = await prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: prerequisites },
        isCompleted: true,
      },
      select: {
        lessonId: true,
      },
    });

    const completedLessonIds = new Set(completedLessons.map(p => p.lessonId));
    const missing = prerequisites.filter(reqId => !completedLessonIds.has(reqId));

    return {
      met: missing.length === 0,
      missing: missing.length > 0 ? missing : undefined,
    };
  } catch (error) {
    console.error('Error checking prerequisites:', error);
    return { met: false };
  }
};


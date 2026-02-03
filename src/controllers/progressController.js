import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


/**
 * Update lesson progress
 */
export const updateLessonProgress = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { lessonId } = req.params;
    const { isCompleted, watchTime } = req.body;
    const userId = req.user.id;

    // Check if user is enrolled in the course
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
      },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    // Check enrollment
    if (lesson.course.enrollments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course',
      });
    }

    // Update or create progress
    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        isCompleted: isCompleted !== undefined ? isCompleted : undefined,
        watchTime: watchTime !== undefined ? watchTime : undefined,
        completedAt: isCompleted === true ? new Date() : undefined,
      },
      create: {
        userId,
        lessonId,
        isCompleted: isCompleted || false,
        watchTime: watchTime || 0,
        completedAt: isCompleted === true ? new Date() : null,
      },
    });

    // Update course progress
    const totalLessons = await prisma.lesson.count({
      where: { courseId: lesson.courseId },
    });

    const completedLessons = await prisma.lessonProgress.count({
      where: {
        userId,
        lesson: {
          courseId: lesson.courseId,
        },
        isCompleted: true,
      },
    });

    const courseProgress = Math.round((completedLessons / totalLessons) * 100);

    // Update enrollment progress
    await prisma.enrollment.updateMany({
      where: {
        userId,
        courseId: lesson.courseId,
      },
      data: {
        progress: courseProgress,
        completedAt: courseProgress === 100 ? new Date() : null,
        status: courseProgress === 100 ? 'COMPLETED' : 'ACTIVE',
      },
    });

    res.json({
      success: true,
      data: progress,
      courseProgress,
      message: 'Progress updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get course progress
 */
export const getCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'You are not enrolled in this course',
      });
    }

    // Get course with lessons
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: {
          orderBy: {
            order: 'asc',
          },
          include: {
            progress: {
              where: {
                userId,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    res.json({
      success: true,
      data: {
        enrollment,
        course,
      },
    });
  } catch (error) {
    next(error);
  }
};



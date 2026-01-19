import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { generateSlug } from '../utils/helpers.js';

const prisma = new PrismaClient();

/**
 * Get all lessons for a course
 */
export const getCourseLessons = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    // Use findFirst to support both UUID id and slug
    const course = await prisma.course.findFirst({
      where: {
        OR: [
          ...(courseId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? [{ id: courseId }] : []),
          { slug: courseId },
        ],
      },
      include: {
        instructor: true,
        chapters: {
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              ...(userId && {
                include: {
                  progress: { where: { userId } },
                },
              }),
            },
          },
          orderBy: { order: 'asc' },
        },
        lessons: {
          where: { chapterId: null },
          orderBy: { order: 'asc' },
          ...(userId && {
            include: {
              progress: { where: { userId } },
            },
          }),
        },
        ...(userId && {
          enrollments: {
            where: { userId, status: 'ACTIVE' },
          },
        }),
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const isEnrolled = !!(userId && course.enrollments && course.enrollments.length > 0);
    const isInstructor = !!(userId && course.instructor?.id === userId);
    // Assuming you have a way to check for admin, if not, we'll stick to instructor for now
    const hasFullAccess = isInstructor;

    // Helper to process a single lesson
    const processLesson = (lesson, chapterIsPreview = false) => {
      if (!hasFullAccess && !isEnrolled && !lesson.isPreview && !chapterIsPreview) {
        return {
          ...lesson,
          videoUrl: null,
          content: null,
          attachmentUrl: null,
        };
      }
      return lesson;
    };

    // Flatten all lessons
    const allLessons = [];

    // Add lessons from chapters
    course.chapters?.forEach(chapter => {
      chapter.lessons?.forEach(lesson => {
        allLessons.push(processLesson(lesson, chapter.isPreview));
      });
    });

    // Add lessons without chapters
    course.lessons?.forEach(lesson => {
      allLessons.push(processLesson(lesson, false));
    });

    // Sort all lessons by order if needed, but they are already ordered within their groups
    // If you want a global order, you might need a secondary sort here

    res.json({
      success: true,
      data: allLessons,
    });
  } catch (error) {
    console.error('Error in getCourseLessons:', error);
    next(error);
  }
};

/**
 * Get lesson by ID
 */
export const getLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            enrollments: userId ? {
              where: {
                userId,
                status: 'ACTIVE',
              },
            } : false,
          },
        },
        progress: userId ? {
          where: {
            userId,
          },
        } : false,
        quiz: true,
      },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    // Check access
    if (userId) {
      const isEnrolled = lesson.course.enrollments && lesson.course.enrollments.length > 0;
      if (!isEnrolled && !lesson.isPreview) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to access this lesson',
        });
      }
    } else if (!lesson.isPreview) {
      return res.status(403).json({
        success: false,
        message: 'Please enroll in the course to access this lesson',
      });
    }

    res.json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create lesson (Admin only)
 */
export const createLesson = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      courseId,
      chapterId,
      title,
      slug,
      description,
      content,
      videoUrl,
      videoDuration,
      attachmentUrl,
      lessonType,
      order,
      isPreview,
      isLocked,
      unlockRequirement,
    } = req.body;

    // Validate course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return res.status(400).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Auto-generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug && title) {
      finalSlug = generateSlug(title);

      // Ensure slug is unique within the course
      let slugExists = await prisma.lesson.findFirst({
        where: {
          courseId,
          slug: finalSlug,
        },
      });

      let counter = 1;
      while (slugExists) {
        finalSlug = `${generateSlug(title)}-${counter}`;
        slugExists = await prisma.lesson.findFirst({
          where: {
            courseId,
            slug: finalSlug,
          },
        });
        counter++;
      }
    }

    // Validate chapter if provided
    if (chapterId) {
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
      });
      if (!chapter || chapter.courseId !== courseId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid chapter ID or chapter does not belong to this course',
        });
      }
    }

    // Get max order if not provided (within chapter if specified)
    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === null) {
      const whereClause = chapterId ? { courseId, chapterId } : { courseId, chapterId: null };
      const lastLesson = await prisma.lesson.findFirst({
        where: whereClause,
        orderBy: { order: 'desc' },
      });
      finalOrder = lastLesson ? lastLesson.order + 1 : 0;
    }

    // Parse unlockRequirement if provided
    let parsedUnlockRequirement = null;
    if (unlockRequirement) {
      try {
        parsedUnlockRequirement = typeof unlockRequirement === 'string'
          ? JSON.parse(unlockRequirement)
          : unlockRequirement;
      } catch (e) {
        parsedUnlockRequirement = unlockRequirement;
      }
    }

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        chapterId: chapterId || null,
        title,
        slug: finalSlug,
        description: description || null,
        content: content || null,
        videoUrl: req.cloudinary?.videoUrl || videoUrl || null,
        videoDuration: req.cloudinary?.videoDuration || (videoDuration ? parseInt(videoDuration) : null),
        attachmentUrl: req.cloudinary?.attachmentUrl || attachmentUrl || null,
        lessonType: lessonType || 'VIDEO',
        order: finalOrder,
        isPreview: isPreview === true || isPreview === 'true',
        isLocked: isLocked === true || isLocked === 'true',
        unlockRequirement: parsedUnlockRequirement,
      },
      include: {
        course: true,
        chapter: true,
      },
    });

    res.status(201).json({
      success: true,
      data: lesson,
      message: 'Lesson created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lesson (Admin only)
 */
export const updateLesson = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const {
      chapterId,
      title,
      slug,
      description,
      content,
      videoUrl,
      videoDuration,
      attachmentUrl,
      lessonType,
      order,
      isPreview,
      isLocked,
      unlockRequirement,
    } = req.body;

    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!existingLesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    // Handle slug: if name changed and slug not provided, auto-generate
    let finalSlug = slug;
    if (!finalSlug && title && title !== existingLesson.title) {
      finalSlug = generateSlug(title);

      // Ensure slug is unique within the course (excluding current lesson)
      let slugExists = await prisma.lesson.findFirst({
        where: {
          courseId: existingLesson.courseId,
          slug: finalSlug,
          NOT: { id },
        },
      });

      let counter = 1;
      while (slugExists) {
        finalSlug = `${generateSlug(title)}-${counter}`;
        slugExists = await prisma.lesson.findFirst({
          where: {
            courseId: existingLesson.courseId,
            slug: finalSlug,
            NOT: { id },
          },
        });
        counter++;
      }
    }

    // Validate chapter if provided
    if (chapterId !== undefined) {
      if (chapterId) {
        const chapter = await prisma.chapter.findUnique({
          where: { id: chapterId },
        });
        if (!chapter || chapter.courseId !== existingLesson.courseId) {
          return res.status(400).json({
            success: false,
            message: 'Invalid chapter ID or chapter does not belong to this course',
          });
        }
      }
    }

    // Parse unlockRequirement if provided
    let parsedUnlockRequirement = null;
    if (unlockRequirement !== undefined) {
      if (unlockRequirement) {
        try {
          parsedUnlockRequirement = typeof unlockRequirement === 'string'
            ? JSON.parse(unlockRequirement)
            : unlockRequirement;
        } catch (e) {
          parsedUnlockRequirement = unlockRequirement;
        }
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (finalSlug) updateData.slug = finalSlug;
    if (chapterId !== undefined) updateData.chapterId = chapterId || null;
    if (description !== undefined) updateData.description = description || null;
    if (content !== undefined) updateData.content = content || null;
    if (req.cloudinary?.videoUrl || videoUrl !== undefined) {
      updateData.videoUrl = req.cloudinary?.videoUrl || videoUrl || null;
    }
    if (req.cloudinary?.videoDuration || videoDuration !== undefined) {
      updateData.videoDuration = req.cloudinary?.videoDuration || (videoDuration ? parseInt(videoDuration) : null);
    }
    if (req.cloudinary?.attachmentUrl || attachmentUrl !== undefined) {
      updateData.attachmentUrl = req.cloudinary?.attachmentUrl || attachmentUrl || null;
    }
    if (lessonType) updateData.lessonType = lessonType;
    if (order !== undefined) updateData.order = parseInt(order);
    if (isPreview !== undefined) {
      updateData.isPreview = isPreview === true || isPreview === 'true';
    }
    if (isLocked !== undefined) {
      updateData.isLocked = isLocked === true || isLocked === 'true';
    }
    if (unlockRequirement !== undefined) {
      updateData.unlockRequirement = parsedUnlockRequirement;
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
        chapter: true,
      },
    });

    res.json({
      success: true,
      data: lesson,
      message: 'Lesson updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Lesson with this slug already exists in this course. Please use a different slug.',
      });
    }
    console.error('Error updating lesson:', error);
    next(error);
  }
};

/**
 * Delete lesson (Admin only)
 */
export const deleteLesson = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.lesson.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }
    next(error);
  }
};



import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { generateSlug, generateUniqueSlug } from '../utils/helpers.js';

const prisma = new PrismaClient();

/**
 * Get all chapters for a course
 */
export const getCourseChapters = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const chapters = await prisma.chapter.findMany({
      where: {
        course: {
          OR: [
            ...(courseId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? [{ id: courseId }] : []),
            { slug: courseId },
          ],
        }
      },
      include: {
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            lessons: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    res.json({
      success: true,
      data: chapters,
    });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    next(error);
  }
};

/**
 * Get chapter by ID
 */
export const getChapterById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        course: true,
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    res.json({
      success: true,
      data: chapter,
    });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    next(error);
  }
};

/**
 * Create chapter (Admin only)
 */
export const createChapter = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { courseId, title, slug, description, order, isLocked, isPreview } = req.body;

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
      const baseSlug = generateSlug(title);
      finalSlug = await generateUniqueSlug(baseSlug, async (s) => {
        return await prisma.chapter.findFirst({
          where: {
            courseId,
            slug: s,
          },
        });
      });
    }

    // Get max order if not provided
    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === null) {
      const lastChapter = await prisma.chapter.findFirst({
        where: { courseId },
        orderBy: { order: 'desc' },
      });
      finalOrder = lastChapter ? lastChapter.order + 1 : 0;
    }

    const chapter = await prisma.chapter.create({
      data: {
        courseId,
        title,
        slug: finalSlug,
        description: description || null,
        order: finalOrder,
        isLocked: isLocked === true || isLocked === 'true',
        isPreview: isPreview === true || isPreview === 'true',
      },
      include: {
        lessons: true,
      },
    });

    res.status(201).json({
      success: true,
      data: chapter,
      message: 'Chapter created successfully',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Chapter with this slug already exists in this course',
      });
    }
    console.error('Error creating chapter:', error);
    next(error);
  }
};

/**
 * Update chapter (Admin only)
 */
export const updateChapter = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { title, slug, description, order, isLocked, isPreview } = req.body;

    // Check if chapter exists
    const existingChapter = await prisma.chapter.findUnique({
      where: { id },
    });

    if (!existingChapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // Handle slug update
    let finalSlug = slug || existingChapter.slug;
    if (slug && slug !== existingChapter.slug) {
      const baseSlug = generateSlug(slug || title || existingChapter.title);
      finalSlug = await generateUniqueSlug(baseSlug, async (s) => {
        return await prisma.chapter.findFirst({
          where: {
            courseId: existingChapter.courseId,
            slug: s,
            NOT: { id },
          },
        });
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (finalSlug) updateData.slug = finalSlug;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = parseInt(order);
    if (isLocked !== undefined) updateData.isLocked = isLocked === true || isLocked === 'true';
    if (isPreview !== undefined) updateData.isPreview = isPreview === true || isPreview === 'true';

    const chapter = await prisma.chapter.update({
      where: { id },
      data: updateData,
      include: {
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    res.json({
      success: true,
      data: chapter,
      message: 'Chapter updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Chapter with this slug already exists in this course',
      });
    }
    console.error('Error updating chapter:', error);
    next(error);
  }
};

/**
 * Delete chapter (Admin only)
 */
export const deleteChapter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // Prevent deletion if chapter has lessons
    if (chapter._count.lessons > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete chapter with lessons. Please delete or move lessons first.',
      });
    }

    await prisma.chapter.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Chapter deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    next(error);
  }
};

/**
 * Reorder chapters (Admin only)
 */
export const reorderChapters = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { order } = req.body;

    if (order === undefined || order === null) {
      return res.status(400).json({
        success: false,
        message: 'Order is required',
      });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: { order: parseInt(order) },
    });

    res.json({
      success: true,
      data: updatedChapter,
      message: 'Chapter reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering chapter:', error);
    next(error);
  }
};

/**
 * Toggle lock status (Admin only)
 */
export const toggleLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isLocked } = req.body;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: {
        isLocked: isLocked !== undefined
          ? (isLocked === true || isLocked === 'true')
          : !chapter.isLocked
      },
    });

    res.json({
      success: true,
      data: updatedChapter,
      message: `Chapter ${updatedChapter.isLocked ? 'locked' : 'unlocked'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling chapter lock:', error);
    next(error);
  }
};

/**
 * Toggle preview status (Admin only)
 */
export const togglePreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPreview } = req.body;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: {
        isPreview: isPreview !== undefined
          ? (isPreview === true || isPreview === 'true')
          : !chapter.isPreview
      },
    });

    res.json({
      success: true,
      data: updatedChapter,
      message: `Chapter ${updatedChapter.isPreview ? 'marked as preview' : 'preview removed'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling chapter preview:', error);
    next(error);
  }
};


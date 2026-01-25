import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Get all published success stories (Public)
 */
export const getSuccessStories = async (req, res, next) => {
  try {
    const { featured, courseId, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isPublished: true,
    };
    if (featured === 'true') where.featured = true;
    if (courseId) where.courseId = courseId;

    const [stories, total] = await Promise.all([
      prisma.studentSuccessStory.findMany({
        where,
        include: {
          course: {
            include: {
              instructor: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: [
          { featured: 'desc' },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.studentSuccessStory.count({ where }),
    ]);

    res.json({
      success: true,
      data: stories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get success story by ID (Public)
 */
export const getSuccessStoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const story = await prisma.studentSuccessStory.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            instructor: true,
          },
        },
      },
    });

    if (!story || !story.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'Success story not found',
      });
    }

    res.json({
      success: true,
      data: story,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create success story (Admin only)
 */
export const createSuccessStory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      studentName,
      studentImage,
      courseId,
      title,
      story,
      achievement,
      company,
      position,
      testimonial,
      isPublished,
      featured,
      order,
    } = req.body;

    const successStory = await prisma.studentSuccessStory.create({
      data: {
        studentName,
        studentImage: req.cloudinary?.url || studentImage,
        courseId,
        title,
        story,
        achievement,
        company,
        position,
        testimonial,
        isPublished: isPublished || false,
        featured: featured || false,
        order: order || 0,
      },
      include: {
        course: true,
      },
    });

    res.status(201).json({
      success: true,
      data: successStory,
      message: 'Success story created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update success story (Admin only)
 */
export const updateSuccessStory = async (req, res, next) => {
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
      studentName,
      studentImage,
      courseId,
      title,
      story,
      achievement,
      company,
      position,
      testimonial,
      isPublished,
      featured,
      order,
    } = req.body;

    const updateData = {};
    if (studentName) updateData.studentName = studentName;
    if (req.cloudinary?.url || studentImage) {
      updateData.studentImage = req.cloudinary?.url || studentImage;
    }
    if (courseId !== undefined) updateData.courseId = courseId;
    if (title) updateData.title = title;
    if (story) updateData.story = story;
    if (achievement !== undefined) updateData.achievement = achievement;
    if (company !== undefined) updateData.company = company;
    if (position !== undefined) updateData.position = position;
    if (testimonial !== undefined) updateData.testimonial = testimonial;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (featured !== undefined) updateData.featured = featured;
    if (order !== undefined) updateData.order = order;

    const successStory = await prisma.studentSuccessStory.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
      },
    });

    res.json({
      success: true,
      data: successStory,
      message: 'Success story updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Success story not found',
      });
    }
    next(error);
  }
};

/**
 * Delete success story (Admin only)
 */
export const deleteSuccessStory = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.studentSuccessStory.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Success story deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Success story not found',
      });
    }
    next(error);
  }
};



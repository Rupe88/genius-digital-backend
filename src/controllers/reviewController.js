import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Create or update course review
 */
export const createReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Check if user is enrolled and completed the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to review it',
      });
    }

    // Create or update review
    const review = await prisma.review.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      create: {
        userId,
        courseId,
        rating,
        comment: comment || null,
      },
      update: {
        rating,
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Update course rating
    await updateCourseRating(courseId);

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get course reviews
 */
export const getCourseReviews = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { courseId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({
        where: { courseId },
      }),
    ]);

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      success: true,
      data: reviews,
      averageRating: parseFloat((avgRating._avg.rating || 0).toFixed(2)),
      totalReviews: avgRating._count.rating,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's review for a course
 */
export const getUserReview = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const review = await prisma.review.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete review
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const review = await prisma.review.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await prisma.review.delete({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    // Update course rating
    await updateCourseRating(courseId);

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Update course rating
 */
const updateCourseRating = async (courseId) => {
  const ratingStats = await prisma.review.aggregate({
    where: { courseId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.course.update({
    where: { id: courseId },
    data: {
      rating: ratingStats._avg.rating ? parseFloat(ratingStats._avg.rating.toFixed(2)) : null,
      totalRatings: ratingStats._count.rating,
    },
  });
};

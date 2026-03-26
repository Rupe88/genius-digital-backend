import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';

const reviewFieldNames = prisma?._runtimeDataModel?.models?.Review?.fields?.map((f) => f.name) || [];
const supportsReviewModeration = reviewFieldNames.includes('isApproved');


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
    const { comment } = req.body;
    const userId = req.user.id;
    const effectiveRating = 5;

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
        rating: effectiveRating,
        comment: comment || null,
        ...(supportsReviewModeration
          ? {
              isApproved: false,
              reviewedAt: null,
              reviewedById: null,
            }
          : {}),
      },
      update: {
        rating: effectiveRating,
        comment: comment || null,
        ...(supportsReviewModeration
          ? {
              isApproved: false,
              reviewedAt: null,
              reviewedById: null,
            }
          : {}),
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
      message: 'Review submitted successfully. It will be visible after admin approval.',
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

    const where = supportsReviewModeration ? { courseId, isApproved: true } : { courseId };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
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
        where,
      }),
    ]);

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where,
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
    where: supportsReviewModeration ? { courseId, isApproved: true } : { courseId },
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

/**
 * Admin: list all course reviews with moderation status
 */
export const getAllReviewsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const approved = req.query.approved;
    const search = String(req.query.search || req.query.q || '').trim();

    const where = {
      ...(supportsReviewModeration && approved === 'true' ? { isApproved: true } : {}),
      ...(supportsReviewModeration && approved === 'false' ? { isApproved: false } : {}),
      ...(search
        ? {
            OR: [
              { comment: { contains: search, mode: 'insensitive' } },
              { user: { fullName: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { course: { title: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          course: { select: { id: true, title: true } },
          ...(supportsReviewModeration
            ? { reviewedBy: { select: { id: true, fullName: true, email: true } } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      success: true,
      data: reviews,
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
 * Admin: approve/reject review visibility
 */
export const moderateReview = async (req, res, next) => {
  try {
    if (!supportsReviewModeration) {
      return res.status(503).json({
        success: false,
        message: 'Review moderation fields are not available in current deployment. Please run migration and redeploy.',
      });
    }

    const { id } = req.params;
    const isApproved = req.body.isApproved === true || req.body.isApproved === 'true';

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        isApproved,
        reviewedAt: new Date(),
        reviewedById: req.user.id,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await updateCourseRating(review.courseId);

    return res.json({
      success: true,
      message: `Review ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: edit review (comment/rating/approval)
 */
export const updateReviewAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment, rating, isApproved } = req.body;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const data = {};
    if (comment !== undefined) data.comment = String(comment || '').trim() || null;
    if (rating !== undefined) {
      const numericRating = parseInt(rating, 10);
      if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ success: false, message: 'rating must be between 1 and 5' });
      }
      data.rating = numericRating;
    }
    if (supportsReviewModeration && isApproved !== undefined) {
      data.isApproved = isApproved === true || isApproved === 'true';
      data.reviewedAt = new Date();
      data.reviewedById = req.user.id;
    }

    const updated = await prisma.review.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true } },
        ...(supportsReviewModeration
          ? { reviewedBy: { select: { id: true, fullName: true, email: true } } }
          : {}),
      },
    });

    await updateCourseRating(review.courseId);
    return res.json({ success: true, message: 'Review updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: delete any review by id
 */
export const deleteReviewAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    await prisma.review.delete({ where: { id } });
    await updateCourseRating(review.courseId);

    return res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
};

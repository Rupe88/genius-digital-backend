import { prisma } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Get all comments for a course (public, paginated). Simple flat list, no nesting.
 */
export const getByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.courseComment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.courseComment.count({ where: { courseId } }),
  ]);

  res.json({
    success: true,
    data: comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

/**
 * Create a comment (authenticated, enrolled users only).
 */
export const create = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required',
    });
  }

  const trimmed = content.trim();
  if (trimmed.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Comment must be at most 2000 characters',
    });
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });

  if (!enrollment) {
    return res.status(403).json({
      success: false,
      message: 'You must be enrolled in this course to comment',
    });
  }

  const comment = await prisma.courseComment.create({
    data: {
      userId,
      courseId,
      content: trimmed,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: comment,
  });
});

/**
 * Delete a comment (own comment or admin).
 */
export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'ADMIN';

  const comment = await prisma.courseComment.findUnique({
    where: { id },
  });

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found',
    });
  }

  if (comment.userId !== userId && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own comment',
    });
  }

  await prisma.courseComment.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Comment deleted',
  });
});

import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Get blog comments
 */
export const getBlogComments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, approved } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      blogId: id,
      parentId: null, // Only top-level comments
    };

    // Filter by approval status (admin can see all)
    if (req.user?.role === 'ADMIN') {
      if (approved === 'true') {
        where.isApproved = true;
      } else if (approved === 'false') {
        where.isApproved = false;
      }
    } else {
      where.isApproved = true; // Public only sees approved comments
    }

    const [comments, total] = await Promise.all([
      prisma.blogComment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
          replies: {
            where: {
              isApproved: req.user?.role === 'ADMIN' ? undefined : true,
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
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.blogComment.count({ where }),
    ]);

    res.json({
      success: true,
      data: comments,
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
 * Create blog comment
 */
export const createBlogComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user?.id || null;
    const name = req.user?.fullName || req.body.name || 'Anonymous';
    const email = req.user?.email || req.body.email || null;

    // Check if blog exists
    const blog = await prisma.blog.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Only allow comments on published blogs
    if (blog.status !== 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot comment on unpublished blog',
      });
    }

    // Validate parent comment if replying
    if (parentId) {
      const parentComment = await prisma.blogComment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment || parentComment.blogId !== id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent comment',
        });
      }
    }

    // Require email if not authenticated
    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for anonymous comments',
      });
    }

    const comment = await prisma.blogComment.create({
      data: {
        blogId: id,
        userId: userId || null,
        name,
        email: email || null,
        content,
        parentId: parentId || null,
        isApproved: req.user?.role === 'ADMIN', // Auto-approve admin comments
      },
      include: {
        user: userId
          ? {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            }
          : false,
      },
    });

    res.status(201).json({
      success: true,
      message: req.user?.role === 'ADMIN' ? 'Comment created successfully' : 'Comment submitted for approval',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update blog comment
 */
export const updateBlogComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id, commentId } = req.params;
    const { content } = req.body;

    const comment = await prisma.blogComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.blogId !== id) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check authorization
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment',
      });
    }

    const updatedComment = await prisma.blogComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: comment.userId
          ? {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            }
          : false,
      },
    });

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete blog comment
 */
export const deleteBlogComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;

    const comment = await prisma.blogComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.blogId !== id) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check authorization
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment',
      });
    }

    await prisma.blogComment.delete({
      where: { id: commentId },
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve/reject comment (Admin only)
 */
export const moderateComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const { isApproved } = req.body;

    const comment = await prisma.blogComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.blogId !== id) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    const updatedComment = await prisma.blogComment.update({
      where: { id: commentId },
      data: { isApproved: isApproved === true || isApproved === 'true' },
      include: {
        user: comment.userId
          ? {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            }
          : false,
      },
    });

    res.json({
      success: true,
      message: `Comment ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: updatedComment,
    });
  } catch (error) {
    next(error);
  }
};


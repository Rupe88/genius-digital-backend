import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


/**
 * Get user's wishlist (Authenticated)
 */
export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            instructor: true,
            category: true,
          },
        },
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: wishlistItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add item to wishlist (Authenticated)
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { courseId, productId } = req.body;

    if (!courseId && !productId) {
      return res.status(400).json({
        success: false,
        message: 'Either courseId or productId is required',
      });
    }

    if (courseId && productId) {
      return res.status(400).json({
        success: false,
        message: 'Only one of courseId or productId can be provided',
      });
    }

    // Check if item already in wishlist
    const existing = await prisma.wishlistItem.findFirst({
      where: {
        userId,
        ...(courseId ? { courseId } : { productId }),
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Item already in wishlist',
      });
    }

    // Verify course/product exists
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
    }

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
    }

    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId,
        ...(courseId ? { courseId } : { productId }),
      },
      include: {
        course: {
          include: {
            instructor: true,
            category: true,
          },
        },
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: wishlistItem,
      message: 'Item added to wishlist',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Item already in wishlist',
      });
    }
    next(error);
  }
};

/**
 * Remove item from wishlist (Authenticated)
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const wishlistItem = await prisma.wishlistItem.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist',
      });
    }

    await prisma.wishlistItem.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Item removed from wishlist',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist',
      });
    }
    next(error);
  }
};

/**
 * Clear wishlist (Authenticated)
 */
export const clearWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await prisma.wishlistItem.deleteMany({
      where: { userId },
    });

    res.json({
      success: true,
      message: 'Wishlist cleared',
    });
  } catch (error) {
    next(error);
  }
};


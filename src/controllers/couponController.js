import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';
import { validateCoupon } from '../services/couponService.js';


/**
 * Validate coupon code (Public)
 */
export const validateCouponCode = async (req, res, next) => {
  try {
    const { code, amount, courseId, productIds } = req.body;
    const userId = req.user?.id;

    const validation = await validateCoupon(code, userId, amount, courseId, productIds);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    res.json({
      success: true,
      data: {
        coupon: {
          id: validation.coupon.id,
          code: validation.coupon.code,
          couponType: validation.coupon.couponType,
          discountValue: validation.coupon.discountValue,
        },
        discountAmount: validation.discountAmount,
        finalAmount: validation.finalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** Start of today UTC for consistent "active" filtering (exclude expired = validUntil in the past) */
function startOfToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Get all active coupons (Public) – only coupons that are currently valid (not yet expired).
 * validUntil is treated as end-of-day, so "valid until Dec 31" means through end of Dec 31.
 */
export const getActiveCoupons = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = startOfToday();

    const coupons = await prisma.coupon.findMany({
      where: {
        status: 'ACTIVE',
        validFrom: {
          lte: now,
        },
        validUntil: {
          gte: todayStart,
        },
      },
      select: {
        id: true,
        code: true,
        description: true,
        couponType: true,
        discountValue: true,
        minPurchase: true,
        maxDiscount: true,
        validFrom: true,
        validUntil: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all coupons (Admin only)
 */
export const getAllCoupons = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        include: {
          _count: {
            select: {
              usages: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    res.json({
      success: true,
      data: coupons,
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
 * Get coupon by ID
 */
export const getCouponById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          take: 10,
          orderBy: {
            usedAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    res.json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create coupon (Admin only)
 */
export const createCoupon = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      code,
      description,
      couponType,
      discountValue,
      minPurchase,
      maxDiscount,
      usageLimit,
      userLimit,
      validFrom,
      validUntil,
      applicableCourses,
      applicableProducts,
    } = req.body;

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        couponType,
        discountValue: parseFloat(discountValue),
        minPurchase: minPurchase ? parseFloat(minPurchase) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        userLimit: userLimit ? parseInt(userLimit) : null,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        applicableCourses: applicableCourses ? JSON.stringify(applicableCourses) : null,
        applicableProducts: applicableProducts ? JSON.stringify(applicableProducts) : null,
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      success: true,
      data: coupon,
      message: 'Coupon created successfully',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Coupon with this code already exists',
      });
    }
    next(error);
  }
};

/**
 * Update coupon (Admin only)
 */
export const updateCoupon = async (req, res, next) => {
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
      code,
      description,
      couponType,
      discountValue,
      minPurchase,
      maxDiscount,
      usageLimit,
      userLimit,
      validFrom,
      validUntil,
      applicableCourses,
      applicableProducts,
      status,
    } = req.body;

    const updateData = {};
    if (code !== undefined && code !== '') updateData.code = String(code).toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (couponType !== undefined) updateData.couponType = couponType;
    if (discountValue !== undefined) updateData.discountValue = parseFloat(discountValue);
    if (minPurchase !== undefined) updateData.minPurchase = minPurchase ? parseFloat(minPurchase) : null;
    if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? parseInt(usageLimit, 10) : null;
    if (userLimit !== undefined) updateData.userLimit = userLimit ? parseInt(userLimit, 10) : null;
    if (validFrom !== undefined && validFrom !== '') updateData.validFrom = new Date(validFrom);
    if (validUntil !== undefined && validUntil !== '') updateData.validUntil = new Date(validUntil);
    if (applicableCourses !== undefined) {
      const courses = Array.isArray(applicableCourses) ? applicableCourses : [];
      updateData.applicableCourses = courses.length > 0 ? JSON.stringify(courses) : null;
    }
    if (applicableProducts !== undefined) {
      const products = Array.isArray(applicableProducts) ? applicableProducts : [];
      updateData.applicableProducts = products.length > 0 ? JSON.stringify(products) : null;
    }
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      const existing = await prisma.coupon.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }
      return res.json({ success: true, data: existing, message: 'No changes to update' });
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: coupon,
      message: 'Coupon updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    next(error);
  }
};

/**
 * Delete coupon (Admin only)
 */
export const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.coupon.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({
        success: false,
        message:
          'Cannot delete this coupon while it is linked to orders or payments. Remove those references first, or set the coupon to inactive instead.',
      });
    }
    next(error);
  }
};



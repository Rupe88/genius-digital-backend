import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';
import * as affiliateService from '../services/affiliateService.js';


/**
 * Register as affiliate
 */
export const registerAffiliate = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { bankName, accountNumber, ifscCode, panNumber, commissionRate } = req.body;

    const affiliate = await affiliateService.registerAffiliate(userId, {
      bankName,
      accountNumber,
      ifscCode,
      panNumber,
      commissionRate,
    });

    res.status(201).json({
      success: true,
      message: 'Affiliate registration submitted successfully',
      data: affiliate,
    });
  } catch (error) {
    if (error.message.includes('already registered')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Get my affiliate information
 */
export const getMyAffiliate = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        earnings: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
            enrollment: {
              select: {
                id: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                price: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            enrollments: true,
            earnings: true,
          },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Not registered as affiliate',
      });
    }

    // Get statistics
    const stats = await affiliateService.getAffiliateStats(affiliate.id);

    res.json({
      success: true,
      data: {
        ...affiliate,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all affiliates (Admin only)
 */
export const getAllAffiliates = async (req, res, next) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) {
      where.status = status;
    }

    const [affiliates, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              earnings: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.affiliate.count({ where }),
    ]);

    res.json({
      success: true,
      data: affiliates,
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
 * Update affiliate status (Admin only)
 */
export const updateAffiliateStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { status, commissionRate } = req.body;

    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found',
      });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
    }
    if (commissionRate !== undefined) {
      updateData.commissionRate = parseFloat(commissionRate);
    }

    const updatedAffiliate = await prisma.affiliate.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Affiliate updated successfully',
      data: updatedAffiliate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get affiliate earnings (Admin only)
 */
export const getAffiliateEarnings = async (req, res, next) => {
  try {
    const {
      affiliateId,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (affiliateId) {
      where.affiliateId = affiliateId;
    }
    if (status) {
      where.status = status;
    }

    const [earnings, total] = await Promise.all([
      prisma.affiliateEarning.findMany({
        where,
        include: {
          affiliate: {
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
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          enrollment: {
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.affiliateEarning.count({ where }),
    ]);

    res.json({
      success: true,
      data: earnings,
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
 * Mark earnings as paid (Admin only)
 */
export const markEarningsAsPaid = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { earningIds } = req.body;

    if (!Array.isArray(earningIds) || earningIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Earning IDs array is required',
      });
    }

    const result = await affiliateService.markEarningsAsPaid(earningIds);

    res.json({
      success: true,
      message: 'Earnings marked as paid successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


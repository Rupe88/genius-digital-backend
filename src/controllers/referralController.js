import { validationResult } from 'express-validator';
import * as referralService from '../services/referralService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate sharing links for a course
 */
export const generateSharingLinks = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { courseId } = req.params;

    // Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, status: true, title: true },
    });

    if (!course || course.status !== 'PUBLISHED') {
      return res.status(404).json({
        success: false,
        message: 'Course not found or not available for sharing',
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const sharingUrls = await referralService.generateSharingUrls(userId, courseId, baseUrl);

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title,
        },
        ...sharingUrls,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track referral click (Public endpoint - no authentication required)
 */
export const trackReferralClick = async (req, res, next) => {
  try {
    const { referralCode } = req.params;

    // Get click data from request
    const clickData = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer'),
      userId: req.user ? req.user.id : null, // If user is logged in
      sessionId: req.sessionID || null,
      deviceInfo: {
        userAgent: req.get('User-Agent'),
        acceptLanguage: req.get('Accept-Language'),
        platform: req.useragent ? req.useragent.platform : null,
        browser: req.useragent ? req.useragent.browser : null,
        version: req.useragent ? req.useragent.version : null,
        os: req.useragent ? req.useragent.os : null,
      },
    };

    const click = await referralService.trackReferralClick(referralCode, clickData);

    // Set a cookie to track this click for conversion
    res.cookie('referral_click_id', click.id, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Redirect to course page
    const referralLink = await referralService.getReferralLinkByCode(referralCode);
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses/${referralLink.course.slug}`;

    res.redirect(302, redirectUrl);
  } catch (error) {
    // On error, redirect to home page
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}`;
    res.redirect(302, redirectUrl);
  }
};

/**
 * Get user's referral statistics
 */
export const getReferralStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await referralService.getReferralStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get referral links for a user
 */
export const getReferralLinks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [links, total] = await Promise.all([
      prisma.referralLink.findMany({
        where: { userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              price: true,
              thumbnail: true,
            },
          },
          _count: {
            select: {
              clicks: true,
              conversions: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.referralLink.count({ where: { userId } }),
    ]);

    // Get earnings for each link
    const linksWithEarnings = await Promise.all(
      links.map(async (link) => {
        const earnings = await prisma.referralConversion.aggregate({
          where: {
            referralLinkId: link.id,
            isFraudulent: false,
          },
          _sum: {
            commissionAmount: true,
          },
        });

        return {
          ...link,
          totalEarnings: earnings._sum.commissionAmount || 0,
        };
      })
    );

    res.json({
      success: true,
      data: linksWithEarnings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get referral analytics (Admin only)
 */
export const getReferralAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;

    const analytics = await referralService.getReferralAnalytics({
      startDate,
      endDate,
      status,
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all referral conversions (Admin only)
 */
export const getReferralConversions = async (req, res, next) => {
  try {
    const {
      status,
      isFraudulent,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) {
      where.status = status;
    }
    if (isFraudulent !== undefined) {
      where.isFraudulent = isFraudulent === 'true';
    }

    const [conversions, total] = await Promise.all([
      prisma.referralConversion.findMany({
        where,
        include: {
          referralLink: {
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
          },
          convertedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          click: {
            select: {
              ipAddress: true,
              clickedAt: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.referralConversion.count({ where }),
    ]);

    res.json({
      success: true,
      data: conversions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark referral commissions as paid (Admin only)
 */
export const markCommissionsAsPaid = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { conversionIds } = req.body;

    if (!Array.isArray(conversionIds) || conversionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Conversion IDs array is required',
      });
    }

    const result = await referralService.markReferralCommissionsAsPaid(conversionIds);

    res.json({
      success: true,
      message: 'Referral commissions marked as paid successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate referral link
 */
export const deactivateReferralLink = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const userId = req.user.id;

    const link = await prisma.referralLink.findFirst({
      where: {
        id: linkId,
        userId,
      },
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Referral link not found',
      });
    }

    await prisma.referralLink.update({
      where: { id: linkId },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Referral link deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate referral link
 */
export const reactivateReferralLink = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const userId = req.user.id;

    const link = await prisma.referralLink.findFirst({
      where: {
        id: linkId,
        userId,
      },
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Referral link not found',
      });
    }

    await prisma.referralLink.update({
      where: { id: linkId },
      data: { isActive: true },
    });

    res.json({
      success: true,
      message: 'Referral link reactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

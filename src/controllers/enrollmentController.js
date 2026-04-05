import { prisma } from '../config/database.js';
import { isS3Configured, isOurS3Url, getSignedUrlForMediaUrl } from '../services/s3Service.js';

import { validationResult } from 'express-validator';
import * as referralService from '../services/referralService.js';
import {
  validateCoupon as validateCouponSvc,
  applyCoupon as applyCouponSvc,
} from '../services/couponService.js';


/**
 * Enroll in a course
 */
export const enrollInCourse = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { courseId, affiliateCode } = req.body;
    const userId = req.user.id;

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course',
      });
    }

    // Get course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Reject enrollment for paid courses - enrollment should only happen after payment verification
    if (!course.isFree) {
      return res.status(400).json({
        success: false,
        message: 'Payment required. Please complete payment to enroll in this course.',
      });
    }

    // Check affiliate if provided (legacy affiliate system)
    let affiliateId = null;
    if (affiliateCode) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { affiliateCode },
        include: { user: true },
      });
      if (affiliate && affiliate.status === 'APPROVED') {
        affiliateId = affiliate.userId;
      }
    }

    // Create enrollment - only free courses reach here, so always ACTIVE
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'ACTIVE', // Only free courses can enroll directly
        affiliateId,
      },
      include: {
        course: {
          include: {
            instructor: true,
          },
        },
      },
    });

    // Check for referral cookie and process conversion
    // Only free courses reach here, so process referral immediately
    const referralClickId = req.cookies.referral_click_id;
    if (referralClickId) {
      try {
        // Process referral conversion immediately for free courses
        await referralService.processReferralConversion(userId, courseId, enrollment.id, referralClickId);
        // Clear the cookie after processing
        res.clearCookie('referral_click_id');
      } catch (error) {
        console.error('Error processing referral conversion:', error);
        // Don't fail enrollment if referral processing fails
      }
    }

    // Update course enrollment count
    await prisma.course.update({
      where: { id: courseId },
      data: {
        totalEnrollments: {
          increment: 1,
        },
      },
    });

    res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in course',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: grant course access to a user (manual enrollment)
 */
export const adminGrantEnrollment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { userId, courseId, couponCode } = req.body;

    // Ensure user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Ensure course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check for existing enrollment
    let enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    // If already enrolled, ensure it's active and return success (idempotent)
    if (enrollment) {
      if (enrollment.status !== 'ACTIVE') {
        enrollment = await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'ACTIVE' },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'User already has access to this course',
        data: enrollment,
      });
    }

    const listPrice = Number(course.price) || 0;
    let couponId = null;
    let adminDiscountAmount = null;
    let netPayableAfterDiscount = null;

    if (couponCode && String(couponCode).trim() && listPrice > 0 && !course.isFree) {
      const v = await validateCouponSvc(String(couponCode).trim().toUpperCase(), userId, listPrice, courseId, []);
      if (!v.valid) {
        return res.status(400).json({
          success: false,
          message: v.message,
        });
      }
      couponId = v.coupon.id;
      adminDiscountAmount = v.discountAmount;
      netPayableAfterDiscount = v.finalAmount;
    }

    // Create new ACTIVE enrollment granted by admin
    enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'ACTIVE',
        couponId,
        adminDiscountAmount,
        netPayableAfterDiscount,
      },
    });

    if (couponId && adminDiscountAmount != null) {
      await applyCouponSvc(couponId, userId, null, null, Number(adminDiscountAmount));
    }

    // Update course enrollment count
    await prisma.course.update({
      where: { id: courseId },
      data: {
        totalEnrollments: {
          increment: 1,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Course access granted successfully',
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user enrollments
 */
export const getUserEnrollments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const [enrollmentsRaw, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          course: {
            include: {
              instructor: true,
              category: true,
            },
          },
          coupon: {
            select: {
              id: true,
              code: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.enrollment.count({ where }),
    ]);

    const enrollments = await Promise.all(
      enrollmentsRaw.map(async (enrollment) => {
        let pricePaid =
          enrollment.pricePaid != null ? Number(enrollment.pricePaid) : null;

        if (pricePaid == null) {
          const payment = await prisma.payment.findFirst({
            where: {
              userId: enrollment.userId,
              courseId: enrollment.courseId,
              status: 'COMPLETED',
            },
            select: {
              finalAmount: true,
            },
          });

          const coursePrice =
            enrollment.course?.price != null ? Number(enrollment.course.price) : 0;

          pricePaid = payment ? Number(payment.finalAmount) : coursePrice;
        }

        const listPrice =
          enrollment.course?.price != null ? Number(enrollment.course.price) : 0;
        const netCap =
          enrollment.netPayableAfterDiscount != null
            ? Number(enrollment.netPayableAfterDiscount)
            : listPrice;
        const paidNum = pricePaid ?? 0;
        const remainingBalance = Math.max(0, netCap - paidNum);

        return {
          ...enrollment,
          pricePaid: paidNum,
          listPrice,
          netPayableAfterDiscount:
            enrollment.netPayableAfterDiscount != null
              ? Number(enrollment.netPayableAfterDiscount)
              : null,
          adminDiscountAmount:
            enrollment.adminDiscountAmount != null
              ? Number(enrollment.adminDiscountAmount)
              : null,
          remainingBalance,
        };
      })
    );

    // Ensure course thumbnails use signed S3 URLs for reliable loading on frontend
    if (isS3Configured()) {
      await Promise.all(
        enrollments.map(async (enrollment) => {
          const course = enrollment.course;
          if (course?.thumbnail && isOurS3Url(course.thumbnail)) {
            try {
              course.thumbnail = await getSignedUrlForMediaUrl(course.thumbnail, 3600);
            } catch (err) {
              console.warn('[enrollment] Signed thumbnail URL failed:', course.id, err?.message);
            }
          }
        })
      );
    }

    res.json({
      success: true,
      data: enrollments,
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
 * Get enrollment by ID
 */
export const getEnrollmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            instructor: true,
            lessons: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    // Check if user owns this enrollment or is admin
    if (enrollment.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Mask course thumbnail with signed S3 URL if needed
    if (isS3Configured() && enrollment.course?.thumbnail && isOurS3Url(enrollment.course.thumbnail)) {
      try {
        enrollment.course.thumbnail = await getSignedUrlForMediaUrl(enrollment.course.thumbnail, 3600);
      } catch (err) {
        console.warn('[enrollment] Signed thumbnail URL failed (by id):', enrollment.course.id, err?.message);
      }
    }

    res.json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unenroll from course
 */
export const unenrollFromCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    await prisma.enrollment.delete({
      where: { id: enrollment.id },
    });

    // Update course enrollment count
    await prisma.course.update({
      where: { id: courseId },
      data: {
        totalEnrollments: {
          decrement: 1,
        },
      },
    });

    res.json({
      success: true,
      message: 'Successfully unenrolled from course',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all enrollments (Admin only)
 */
export const getAllEnrollments = async (req, res, next) => {
  try {
    const { status, courseId, userId, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (courseId) where.courseId = courseId;
    if (userId) where.userId = userId;

    // Search by student name, email, or course title
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { user: { fullName: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
        { course: { title: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          course: {
            include: {
              instructor: true,
            },
          },
          coupon: {
            select: {
              id: true,
              code: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.enrollment.count({ where }),
    ]);

    // Fetch price paid for each enrollment
    const enrollmentsWithPrice = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Prefer stored enrollment.pricePaid when present (supports partial/cumulative admin grants)
        let pricePaid =
          enrollment.pricePaid != null ? Number(enrollment.pricePaid) : null;

        if (pricePaid == null) {
          // Fall back to first successful payment for this course and user
          const payment = await prisma.payment.findFirst({
            where: {
              userId: enrollment.userId,
              courseId: enrollment.courseId,
              status: 'COMPLETED',
            },
            select: {
              finalAmount: true,
            },
          });

          // When no payment (e.g. admin-granted full access), fall back to course price for display
          const coursePrice =
            enrollment.course?.price != null ? Number(enrollment.course.price) : 0;

          pricePaid = payment ? Number(payment.finalAmount) : coursePrice;
        }

        const listPrice =
          enrollment.course?.price != null ? Number(enrollment.course.price) : 0;
        const netCap =
          enrollment.netPayableAfterDiscount != null
            ? Number(enrollment.netPayableAfterDiscount)
            : listPrice;
        const paidNum = pricePaid ?? 0;
        const remainingBalance = Math.max(0, netCap - paidNum);

        return {
          ...enrollment,
          enrolledAt: enrollment.createdAt,
          pricePaid: paidNum,
          listPrice,
          netPayableAfterDiscount:
            enrollment.netPayableAfterDiscount != null
              ? Number(enrollment.netPayableAfterDiscount)
              : null,
          adminDiscountAmount:
            enrollment.adminDiscountAmount != null
              ? Number(enrollment.adminDiscountAmount)
              : null,
          remainingBalance,
        };
      })
    );

    res.json({
      success: true,
      data: enrollmentsWithPrice,
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
 * Delete enrollment (Admin only)
 */
export const deleteEnrollment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    await prisma.enrollment.delete({
      where: { id },
    });

    // Update course enrollment count
    await prisma.course.update({
      where: { id: enrollment.courseId },
      data: {
        totalEnrollments: {
          decrement: 1,
        },
      },
    });

    res.json({
      success: true,
      message: 'Enrollment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: grant partial access to a course
 */
export const adminGrantPartialAccess = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { userId, courseId, accessType, durationDays, pricePaid, adminNotes, couponCode } = req.body;

    // Ensure user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Ensure course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Calculate expiration date
    const accessExpiresAt = new Date();
    accessExpiresAt.setDate(accessExpiresAt.getDate() + parseInt(durationDays));

    // Check for existing enrollment
    let enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    const wasExisting = Boolean(enrollment);
    const listPrice = Number(course.price) || 0;

    let newCouponId = null;
    let newDiscount = null;
    let newNetPayable = null;
    let recordCouponUsage = false;

    const wantsCoupon =
      couponCode && String(couponCode).trim() && listPrice > 0 && !course.isFree;

    if (wantsCoupon) {
      if (enrollment?.couponId) {
        return res.status(400).json({
          success: false,
          message:
            'This enrollment already has a coupon. Extend access without selecting a coupon, or remove the enrollment first.',
        });
      }
      const v = await validateCouponSvc(
        String(couponCode).trim().toUpperCase(),
        userId,
        listPrice,
        courseId,
        []
      );
      if (!v.valid) {
        return res.status(400).json({
          success: false,
          message: v.message,
        });
      }
      newCouponId = v.coupon.id;
      newDiscount = v.discountAmount;
      newNetPayable = v.finalAmount;
      recordCouponUsage = true;
    }

    const numericPricePaid = pricePaid ? Number(pricePaid) : 0;

    if (enrollment) {
      // Update existing enrollment – keep cumulative amount paid
      const previousPaid =
        enrollment.pricePaid != null ? Number(enrollment.pricePaid) : 0;
      const updatedTotalPaid =
        previousPaid + (Number.isFinite(numericPricePaid) ? numericPricePaid : 0);

      const updateData = {
        status: 'ACTIVE',
        accessType,
        accessExpiresAt,
        pricePaid: updatedTotalPaid || null,
        grantedByAdmin: true,
        adminNotes,
      };

      if (newCouponId) {
        updateData.couponId = newCouponId;
        updateData.adminDiscountAmount = newDiscount;
        updateData.netPayableAfterDiscount = newNetPayable;
      }

      enrollment = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: updateData,
      });
    } else {
      // Create new enrollment
      const initialPaid = Number.isFinite(numericPricePaid) ? numericPricePaid : 0;

      enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: 'ACTIVE',
          accessType,
          accessExpiresAt,
          pricePaid: initialPaid || null,
          grantedByAdmin: true,
          adminNotes,
          couponId: newCouponId,
          adminDiscountAmount: newDiscount,
          netPayableAfterDiscount: newNetPayable,
        },
      });
    }

    if (recordCouponUsage && newCouponId != null && newDiscount != null) {
      await applyCouponSvc(newCouponId, userId, null, null, Number(newDiscount));
    }

    if (!wasExisting) {
      await prisma.course.update({
        where: { id: courseId },
        data: {
          totalEnrollments: {
            increment: 1,
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      message: `Partial access granted successfully for ${durationDays} days`,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: extend access for an enrollment
 */
export const extendAccess = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { enrollmentId, durationDays, adminNotes } = req.body;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    // Calculate new expiration date
    const currentExpiry = enrollment.accessExpiresAt || new Date();
    const newAccessExpiresAt = new Date(currentExpiry);
    newAccessExpiresAt.setDate(newAccessExpiresAt.getDate() + parseInt(durationDays));

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        accessExpiresAt: newAccessExpiresAt,
        status: 'ACTIVE',
        adminNotes: adminNotes ? `${adminNotes}\nPrevious: ${enrollment.adminNotes || ''}` : enrollment.adminNotes,
      },
    });

    res.json({
      success: true,
      message: `Access extended successfully by ${durationDays} days`,
      data: updatedEnrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check access expiry for a user's course enrollment
 */
export const checkAccessExpiry = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    const accessStatus = getAccessStatus(enrollment);

    res.json({
      success: true,
      data: {
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          accessType: enrollment.accessType,
          accessExpiresAt: enrollment.accessExpiresAt,
          grantedByAdmin: enrollment.grantedByAdmin,
        },
        course: enrollment.course,
        ...accessStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};


// Helper function to get access status
const getAccessStatus = (enrollment) => {
  const now = new Date();
  const accessType = enrollment.accessType || 'FULL';
  
  if (accessType === 'FULL') {
    return {
      accessStatus: 'FULL_ACCESS',
      daysRemaining: null,
      warningLevel: 'NONE',
      accessType: 'FULL'
    };
  }
  
  if (!enrollment.accessExpiresAt) {
    return {
      accessStatus: 'ACTIVE',
      daysRemaining: null,
      warningLevel: 'NONE',
      accessType
    };
  }
  
  const expiresAt = new Date(enrollment.accessExpiresAt);
  const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) {
    return {
      accessStatus: 'EXPIRED',
      daysRemaining,
      warningLevel: 'CRITICAL',
      accessType
    };
  }
  
  if (daysRemaining <= 3) {
    return {
      accessStatus: 'EXPIRING_SOON',
      daysRemaining,
      warningLevel: 'CRITICAL',
      accessType
    };
  }
  
  if (daysRemaining <= 7) {
    return {
      accessStatus: 'EXPIRING_SOON',
      daysRemaining,
      warningLevel: 'HIGH',
      accessType
    };
  }
  
  return {
    accessStatus: 'ACTIVE',
    daysRemaining,
    warningLevel: daysRemaining <= 14 ? 'MEDIUM' : 'LOW',
    accessType
  };
};

// --- Admin: full enrollment CSV (same filters as enrollment list) ---

const SOFT_DELETE_EMAIL_DOMAIN_EXPORT = '@deleted.local';
const MAX_ENROLLMENT_ROWS_EXPORT = 15000;

function csvEscapeEnrollmentExport(val) {
  const s = val == null ? '' : String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

function formatMoneyEnrollmentExport(v) {
  if (v == null || v === '') return '';
  try {
    const n = typeof v === 'object' && v !== null && typeof v.toNumber === 'function' ? v.toNumber() : Number(v);
    if (Number.isNaN(n)) return '';
    return n.toFixed(2);
  } catch {
    return '';
  }
}

function formatDateEnrollmentExport(d) {
  if (!d) return '';
  try {
    return new Date(d).toISOString();
  } catch {
    return '';
  }
}

/**
 * Admin CSV export for enrollments page: respects status, courseId, search (student + course title + phone).
 */
export const exportEnrollmentsDetailCsv = async (req, res, next) => {
  try {
    const { status, courseId } = req.query;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const andClauses = [{ user: { email: { not: { endsWith: SOFT_DELETE_EMAIL_DOMAIN_EXPORT } } } }];

    if (status) andClauses.push({ status });
    if (courseId) andClauses.push({ courseId });

    if (search) {
      andClauses.push({
        OR: [
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { phone: { contains: search, mode: 'insensitive' } } },
          { course: { title: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const where = { AND: andClauses };

    const total = await prisma.enrollment.count({ where });
    if (total > MAX_ENROLLMENT_ROWS_EXPORT) {
      return res.status(400).json({
        success: false,
        message: `Too many enrollments (${total}). Refine status, course, or search (max ${MAX_ENROLLMENT_ROWS_EXPORT} rows).`,
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            isActive: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            isFree: true,
            instructor: { select: { name: true } },
          },
        },
        coupon: { select: { code: true, description: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    const payments =
      userIds.length > 0
        ? await prisma.payment.findMany({
            where: {
              userId: { in: userIds },
              courseId: { not: null },
            },
            select: {
              userId: true,
              courseId: true,
              status: true,
              finalAmount: true,
              discount: true,
            },
          })
        : [];

    const payMap = new Map();
    for (const p of payments) {
      const k = `${p.userId}|${p.courseId}`;
      if (!payMap.has(k)) payMap.set(k, []);
      payMap.get(k).push(p);
    }

    const headers = [
      'login_email_username',
      'user_id',
      'user_full_name',
      'user_phone',
      'user_role',
      'user_active',
      'user_email_verified',
      'user_account_created_at',
      'enrollment_id',
      'enrolled_at',
      'course_id',
      'course_title',
      'course_slug',
      'course_instructor_name',
      'course_list_price',
      'course_is_free',
      'enrollment_status',
      'enrollment_progress_pct',
      'enrollment_completed_at',
      'access_type',
      'access_expires_at',
      'access_status_summary',
      'admin_granted',
      'admin_notes',
      'coupon_code_description',
      'admin_discount_amount',
      'net_payable_total_due',
      'price_paid_recorded_on_enrollment',
      'payments_completed_count',
      'payments_completed_sum_final',
      'payments_completed_sum_discount',
      'installment_count',
      'installment_schedule_total',
      'installment_paid_sum',
      'installment_remaining_unpaid',
      'remaining_balance_after_completed_payments',
      'installment_details',
    ];

    const rows = enrollments.map((e) => {
      const u = e.user;
      const key = `${u.id}|${e.courseId}`;
      const pList = payMap.get(key) || [];
      const completed = pList.filter((p) => p.status === 'COMPLETED');
      const sumFinal = completed.reduce((acc, p) => acc + Number(p.finalAmount), 0);
      const sumDisc = completed.reduce((acc, p) => acc + Number(p.discount), 0);
      const inst = e.installments || [];
      const instTotal = inst.reduce((acc, i) => acc + Number(i.amount), 0);
      const instPaid = inst.filter((i) => i.status === 'PAID').reduce((acc, i) => acc + Number(i.amount), 0);
      const instUnpaid = Math.max(0, instTotal - instPaid);

      const netRaw = e.netPayableAfterDiscount;
      const netNum = netRaw != null ? Number(netRaw) : null;
      const listPriceNum = e.course.isFree ? 0 : Number(e.course.price);
      const effectiveNet = netNum != null && !Number.isNaN(netNum) ? netNum : listPriceNum;
      const balance = !Number.isNaN(effectiveNet) ? (effectiveNet - sumFinal).toFixed(2) : '';

      const couponLabel = e.coupon
        ? [e.coupon.code, e.coupon.description].filter(Boolean).join(' / ')
        : '';

      const instDetails = inst
        .map((i) => {
          const paid = i.paidAt ? `:paidAt=${formatDateEnrollmentExport(i.paidAt)}` : '';
          return `#${i.installmentNumber}:${formatMoneyEnrollmentExport(i.amount)}:${i.status}:${formatDateEnrollmentExport(i.dueDate)}${paid}`;
        })
        .join(' | ');

      const accessInfo = getAccessStatus(e);
      const accessSummary = [
        accessInfo.accessStatus,
        accessInfo.daysRemaining != null ? `days_remaining:${accessInfo.daysRemaining}` : '',
        accessInfo.warningLevel ? `warning:${accessInfo.warningLevel}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      return [
        u.email,
        u.id,
        u.fullName,
        u.phone ?? '',
        u.role,
        u.isActive ? 'Yes' : 'No',
        u.isEmailVerified ? 'Yes' : 'No',
        formatDateEnrollmentExport(u.createdAt),
        e.id,
        formatDateEnrollmentExport(e.createdAt),
        e.course.id,
        e.course.title,
        e.course.slug,
        e.course.instructor?.name ?? '',
        formatMoneyEnrollmentExport(e.course.price),
        e.course.isFree ? 'Yes' : 'No',
        e.status,
        String(e.progress ?? 0),
        formatDateEnrollmentExport(e.completedAt),
        e.accessType ?? '',
        formatDateEnrollmentExport(e.accessExpiresAt),
        accessSummary,
        e.grantedByAdmin ? 'Yes' : 'No',
        (e.adminNotes ?? '').replace(/\r?\n/g, ' ').slice(0, 2000),
        couponLabel,
        formatMoneyEnrollmentExport(e.adminDiscountAmount),
        formatMoneyEnrollmentExport(e.netPayableAfterDiscount),
        formatMoneyEnrollmentExport(e.pricePaid),
        String(completed.length),
        sumFinal.toFixed(2),
        sumDisc.toFixed(2),
        String(inst.length),
        instTotal.toFixed(2),
        instPaid.toFixed(2),
        instUnpaid.toFixed(2),
        balance,
        instDetails,
      ];
    });

    const csvLines = [headers.map(csvEscapeEnrollmentExport).join(','), ...rows.map((r) => r.map(csvEscapeEnrollmentExport).join(','))];
    const csv = `\ufeff${csvLines.join('\r\n')}`;
    const fname = `enrollments-detail-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

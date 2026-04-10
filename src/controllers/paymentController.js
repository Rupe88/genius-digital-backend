import { prisma } from '../config/database.js';
import { isS3Configured, isOurS3Url, getSignedUrlForMediaUrl } from '../services/storageService.js';
import { validationResult } from 'express-validator';
import * as paymentService from '../services/paymentService.js';
import * as installmentService from '../services/installmentService.js';
import * as cardPaymentService from '../services/cardPaymentService.js';
import { config } from '../config/env.js';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isMissingManualProofColumnError = (error) =>
  String(error?.message || '').includes('payments.proofImageUrl') ||
  String(error?.message || '').includes('payments.proofSubmittedAt');

/**
 * Initiate payment
 */
export const initiatePayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      amount,
      paymentMethod,
      courseId,
      orderId,
      couponCode,
      productIds,
      productName,
      successUrl,
      failureUrl,
      installmentId,
    } = req.body;

    const userId = req.user.id;

    let finalAmount = amount;
    let finalCourseId = courseId;
    const cookieReferralClickId = req.cookies.referral_click_id;
    const bodyReferralClickId = req.body.referralClickId;
    let trustedReferralClickId = null;
    if (typeof cookieReferralClickId === 'string' && UUID_V4_REGEX.test(cookieReferralClickId)) {
      trustedReferralClickId = cookieReferralClickId;
    } else if (typeof bodyReferralClickId === 'string' && UUID_V4_REGEX.test(bodyReferralClickId)) {
      // Allow body-based attribution only when cookie is absent.
      trustedReferralClickId = bodyReferralClickId;
    }
    // If both are present and mismatch, trust cookie value only and drop body value.
    if (
      typeof cookieReferralClickId === 'string' &&
      typeof bodyReferralClickId === 'string' &&
      cookieReferralClickId !== bodyReferralClickId &&
      UUID_V4_REGEX.test(cookieReferralClickId)
    ) {
      trustedReferralClickId = cookieReferralClickId;
    }

    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      referralClickId: trustedReferralClickId,
    };

    // If paying for an installment: validate and use installment amount/course
    if (installmentId) {
      const installment = await installmentService.getInstallmentForPayment(installmentId, userId);
      if (!installment) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or already paid installment',
        });
      }
      finalAmount = Number(installment.amount);
      finalCourseId = installment.enrollment.course.id;
      metadata.installmentId = installmentId;
    }

    // Validate that user is not trying to pay for someone else's order/course
    if (orderId) {
      const { PrismaClient } = await import('@prisma/client');
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order || order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this order',
        });
      }
    }

    if (finalCourseId) {
      const course = await prisma.course.findUnique({
        where: { id: finalCourseId },
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
    }

    const result = await paymentService.initiatePayment({
      userId,
      amount: finalAmount,
      paymentMethod,
      courseId: finalCourseId,
      orderId,
      couponCode,
      productIds: productIds || [],
      productName: productName || (installmentId ? 'Installment Payment' : 'Course/Product Payment'),
      successUrl,
      failureUrl,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify payment (for webhooks and callbacks)
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { paymentId, transactionId, paymentMethod } = req.body;
    const verificationData = req.body.verificationData || req.body; // Support both structures

    const result = await paymentService.verifyPayment({
      paymentId,
      transactionId,
      paymentMethod,
      verificationData,
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.payment,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Payment verification failed',
        data: result,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Legacy callback endpoint (no eSewa). Use manual QR flow or card verify.
 */
export const verifyPaymentCallback = async (req, res, next) => {
  try {
    return res.status(400).json({
      success: false,
      message: 'eSewa is disabled. Use manual QR payment or contact support.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Khalti webhook handler
 */
export const khaltiWebhook = async (req, res, next) => {
  try {
    const { pidx, status, transaction_id } = req.body;

    if (status === 'Completed' && pidx) {
      const result = await paymentService.verifyPayment({
        transactionId: transaction_id,
        paymentMethod: 'VISA_CARD', // or determine from payment method
        verificationData: {
          pidx,
          gateway: 'khalti',
        },
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Payment verified',
        });
      }
    }

    res.status(400).json({
      success: false,
      message: 'Payment verification failed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment details
 */
export const getPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await paymentService.getPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Ensure user can only view their own payments (unless admin)
    if (payment.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this payment',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's payments
 */
export const getUserPayments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    let payments = [];
    let total = 0;
    try {
      [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where: { userId },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
            order: {
              select: {
                id: true,
                orderNumber: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.payment.count({
          where: { userId },
        }),
      ]);
    } catch (queryError) {
      if (!isMissingManualProofColumnError(queryError)) {
        throw queryError;
      }
      // Temporary compatibility for DBs that have not applied manual-QR proof columns yet.
      [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where: { userId },
          select: {
            id: true,
            userId: true,
            courseId: true,
            orderId: true,
            amount: true,
            discount: true,
            finalAmount: true,
            currency: true,
            paymentMethod: true,
            esewaRefId: true,
            esewaProductId: true,
            mobileBankName: true,
            mobileBankRef: true,
            cardLastFour: true,
            cardType: true,
            cardholderName: true,
            transactionId: true,
            status: true,
            couponId: true,
            retryCount: true,
            processingTime: true,
            gatewayResponseTime: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
            order: {
              select: {
                id: true,
                orderNumber: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.payment.count({ where: { userId } }),
      ]);
    }

    // Ensure course thumbnails use signed S3 URLs so they load correctly in dashboard/payment history
    if (isS3Configured()) {
      await Promise.all(
        payments.map(async (payment) => {
          const course = payment.course;
          if (course?.thumbnail && isOurS3Url(course.thumbnail)) {
            try {
              course.thumbnail = await getSignedUrlForMediaUrl(course.thumbnail, 3600);
            } catch (err) {
              console.warn('[payments] Signed thumbnail URL failed:', course.id, err?.message);
            }
          }
        })
      );
    }

    res.json({
      success: true,
      data: payments,
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
 * Retry failed payment
 */
export const retryPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { paymentId } = req.params;
    const { paymentMethod } = req.body;
    const userId = req.user.id;

    // Verify payment belongs to user
    const payment = await paymentService.getPaymentById(paymentId);
    if (!payment || payment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this payment',
      });
    }

    const result = await paymentService.retryPayment(paymentId, paymentMethod);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process refund (Admin only)
 */
export const refundPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { paymentId } = req.params;
    const { reason, refundAmount } = req.body;

    const result = await paymentService.processRefund(paymentId, refundAmount, reason);

    res.json({
      success: true,
      data: result.payment,
      refundAmount: result.refundAmount,
      isPartialRefund: result.isPartialRefund,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available payment gateways
 */
export const getAvailableGateways = async (req, res, next) => {
  try {
    const gateways = cardPaymentService.getAvailableGateways();

    gateways.push({
      id: 'manual_qr',
      name: 'QR / Bank transfer (manual)',
      supportsCards: false,
      supportsMobile: true,
      currencies: ['NPR'],
    });

    // Add mobile banking if enabled
    if (config.mobileBankingEnabled) {
      gateways.push({
        id: 'mobile_banking',
        name: 'Mobile Banking',
        supportsCards: false,
        supportsMobile: true,
        currencies: ['NPR'],
      });
    }

    res.json({
      success: true,
      data: gateways,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments (Admin only)
 */
export const getAllPaymentsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    let payments = [];
    let total = 0;

    [payments, total] = await Promise.all([
      prisma.payment.findMany({
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
            select: {
              id: true,
              title: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    // Ensure manual proof URLs are directly usable in admin review table.
    if (isS3Configured()) {
      await Promise.all(
        payments.map(async (payment) => {
          if (payment.proofImageUrl && isOurS3Url(payment.proofImageUrl)) {
            try {
              payment.proofImageUrl = await getSignedUrlForMediaUrl(payment.proofImageUrl, 3600);
            } catch (err) {
              console.warn('[payments-admin] Signed proof URL failed:', payment.id, err?.message);
            }
          }
        })
      );
    }

    // Prioritize manual QR items that are pending and already have proof submitted.
    payments.sort((a, b) => {
      const aPriority = a.paymentMethod === 'MANUAL_QR' && a.status === 'PENDING' && a.proofImageUrl ? 1 : 0;
      const bPriority = b.paymentMethod === 'MANUAL_QR' && b.status === 'PENDING' && b.proofImageUrl ? 1 : 0;
      return bPriority - aPriority;
    });

    res.json({
      success: true,
      data: payments,
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

/** User: submit payment proof screenshot (MANUAL_QR). */
export const submitManualPaymentProof = async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId || !req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'paymentId and proof image are required',
      });
    }
    const result = await paymentService.submitPaymentProof(
      paymentId,
      req.user.id,
      req.file.buffer,
      req.file.mimetype
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/** Admin: get manual payment QR settings */
export const getManualPaymentSettings = async (req, res, next) => {
  try {
    const settings = await paymentService.getManualPaymentSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/** Admin: update instructions / QR URL (JSON) */
export const updateManualPaymentSettings = async (req, res, next) => {
  try {
    const { qrImageUrl, instructions } = req.body;
    const settings = await paymentService.updateManualPaymentSettings({ qrImageUrl, instructions });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/** Admin: upload QR image file → stored URL saved to settings */
export const uploadManualPaymentQr = async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    const { uploadImage } = await import('../services/storageService.js');
    const result = await uploadImage(req.file.buffer, {
      folder: 'lms/manual-payment',
      mimeType: req.file.mimetype || 'image/png',
    });
    const settings = await paymentService.updateManualPaymentSettings({
      qrImageUrl: result.secure_url,
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/** Admin: approve manual payment */
export const approveManualPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const result = await paymentService.approveManualPayment(paymentId, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/** Admin: reject manual payment */
export const rejectManualPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const result = await paymentService.rejectManualPayment(paymentId, req.user.id, reason);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

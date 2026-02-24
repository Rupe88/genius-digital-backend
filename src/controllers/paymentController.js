import { prisma } from '../config/database.js';
import { isS3Configured, isOurS3Url, getSignedUrlForMediaUrl } from '../services/s3Service.js';
import { validationResult } from 'express-validator';
import * as paymentService from '../services/paymentService.js';
import * as cardPaymentService from '../services/cardPaymentService.js';
import * as esewaService from '../services/esewaService.js';
import { config } from '../config/env.js';

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
    } = req.body;

    const userId = req.user.id;

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

    if (courseId) {
      const { PrismaClient } = await import('@prisma/client');
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

    const result = await paymentService.initiatePayment({
      userId,
      amount,
      paymentMethod,
      courseId,
      orderId,
      couponCode,
      productIds: productIds || [],
      productName: productName || 'Course/Product Payment',
      successUrl,
      failureUrl,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        referralClickId: req.body.referralClickId || req.cookies.referral_click_id,
      },
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
 * Public: Verify payment from success page (eSewa redirect).
 * No auth required – we verify using eSewa callback signature.
 */
export const verifyPaymentCallback = async (req, res, next) => {
  try {
    const { transactionId, paymentMethod = 'ESEWA', verificationData = {} } = req.body;

    const tid = transactionId || verificationData.transaction_uuid;
    if (!tid) {
      return res.status(400).json({
        success: false,
        message: 'Missing transaction ID',
      });
    }

    if (paymentMethod === 'ESEWA') {
      const isValid = esewaService.verifyEsewaCallback(verificationData);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid eSewa signature',
        });
      }
    }

    const result = await paymentService.verifyPayment({
      transactionId: tid,
      paymentMethod,
      verificationData,
    });
    if (result.success) {
      return res.json({
        success: true,
        data: result.payment,
      });
    }
    return res.status(400).json({
      success: false,
      message: result.message || 'Payment verification failed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * eSewa webhook/callback handler
 */
export const esewaWebhook = async (req, res, next) => {
  try {
    const callbackData = req.body;

    // Verify signature
    const isValid = esewaService.verifyEsewaCallback(callbackData);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid eSewa signature',
      });
    }

    const { transaction_uuid, total_amount, status } = callbackData;

    // Verify payment
    const result = await paymentService.verifyPayment({
      transactionId: transaction_uuid,
      paymentMethod: 'ESEWA',
      verificationData: callbackData,
    });

    if (result.success) {
      // Return success response to eSewa
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }
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
    const { PrismaClient } = await import('@prisma/client');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
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

    // Add eSewa if configured
    if (config.esewa.merchantId && config.esewa.secretKey) {
      gateways.push({
        id: 'esewa',
        name: 'eSewa',
        supportsCards: false,
        supportsMobile: true,
        currencies: ['NPR'],
      });
    }

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

    const [payments, total] = await Promise.all([
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

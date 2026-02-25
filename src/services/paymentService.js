import { prisma } from '../config/database.js';

import { validateCoupon, applyCoupon } from './couponService.js';
import * as esewaService from './esewaService.js';
import * as mobileBankingService from './mobileBankingService.js';
import * as cardPaymentService from './cardPaymentService.js';
import * as fraudDetectionService from './fraudDetectionService.js';
import * as auditLogService from './auditLogService.js';
import * as affiliateService from './affiliateService.js';
import * as instructorEarningService from './instructorEarningService.js';
import { confirmOrderPayment } from './orderService.js';
import { config } from '../config/env.js';
import crypto from 'crypto';


/**
 * Generate unique transaction ID
 */
const generateTransactionId = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `TXN${timestamp}${random}`.toUpperCase();
};

/**
 * Initiate payment
 * @param {Object} params - Payment parameters
 * @returns {Promise<Object>} Payment initiation result
 */
export const initiatePayment = async (params) => {
  const {
    userId,
    amount,
    paymentMethod,
    courseId = null,
    orderId = null,
    couponCode = null,
    productIds = [],
    productName = 'Course/Product Payment',
    successUrl,
    failureUrl,
    metadata = {},
  } = params;

  const startTime = Date.now();

  // Validate amount
  const paymentAmount = parseFloat(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    throw new Error('Invalid payment amount');
  }

  // Validate payment method
  const validMethods = ['ESEWA', 'MOBILE_BANKING', 'VISA_CARD', 'MASTERCARD'];
  if (!validMethods.includes(paymentMethod)) {
    throw new Error('Invalid payment method');
  }

  // Use preferred payment method if available and not specified
  let finalPaymentMethod = paymentMethod;
  if (!paymentMethod && metadata?.usePreferred) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredPaymentMethod: true },
    });
    if (user?.preferredPaymentMethod) {
      finalPaymentMethod = user.preferredPaymentMethod;
    }
  }

  // Fraud detection
  const fraudCheck = await fraudDetectionService.detectFraudulentPayment({
    userId,
    amount: paymentAmount,
    paymentMethod: finalPaymentMethod,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    transactionId: null, // Will be generated
  });

  if (fraudCheck.isFraudulent) {
    // Log fraud attempt
    await auditLogService.createAuditLog({
      userId,
      action: 'FRAUD_DETECTED',
      entityType: 'PAYMENT',
      description: `Fraudulent payment attempt detected: ${fraudCheck.risks.map(r => r.type).join(', ')}`,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      riskScore: fraudCheck.riskScore,
      metadata: {
        fraudCheck,
        amount: paymentAmount,
        paymentMethod: finalPaymentMethod,
      },
    });

    throw new Error(`Payment blocked due to security concerns: ${fraudCheck.risks[0]?.message}`);
  }

  // Audit log payment initiation
  await auditLogService.createAuditLog({
    userId,
    action: 'PAYMENT_INITIATED',
    entityType: 'PAYMENT',
    description: `Payment initiated: ${finalPaymentMethod} - NPR ${paymentAmount}`,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    requestPath: '/api/payments/initiate',
    riskScore: fraudCheck.riskScore,
    metadata: {
      amount: paymentAmount,
      paymentMethod: finalPaymentMethod,
      courseId,
      orderId,
    },
  });

  // Validate coupon if provided
  let coupon = null;
  let discountAmount = 0;
  let finalAmount = paymentAmount;

  if (couponCode) {
    const couponValidation = await validateCoupon(
      couponCode,
      userId,
      paymentAmount,
      courseId,
      productIds
    );

    if (!couponValidation.valid) {
      throw new Error(couponValidation.message);
    }

    coupon = couponValidation.coupon;
    discountAmount = couponValidation.discountAmount;
    finalAmount = couponValidation.finalAmount;
  }

  // Generate transaction ID
  const transactionId = generateTransactionId();

  // Create payment record in database
  const payment = await prisma.payment.create({
    data: {
      userId,
      courseId,
      orderId,
      amount: paymentAmount,
      discount: discountAmount,
      finalAmount: finalAmount,
      currency: 'NPR',
      paymentMethod: finalPaymentMethod,
      transactionId,
      status: 'PENDING',
      couponId: coupon?.id || null,
      metadata: metadata || {},
    },
  });

  // Initiate payment based on method
  let paymentDetails = null;

  try {
    switch (finalPaymentMethod) {
      case 'ESEWA':
        const esewaUrl = esewaService.generateEsewaPaymentUrl({
          amount: finalAmount.toString(),
          transactionId,
          productName,
          successUrl: successUrl || `${config.frontendUrl}/payment/success`,
          failureUrl: failureUrl || `${config.frontendUrl}/payment/failure`,
        });
        paymentDetails = {
          paymentUrl: esewaUrl.url,
          formData: esewaUrl.formData,
          method: 'ESEWA',
          transactionId,
        };
        break;

      case 'MOBILE_BANKING':
        const mobileBanking = mobileBankingService.createMobileBankingPayment({
          amount: finalAmount.toString(),
          description: productName,
        });
        paymentDetails = {
          ...mobileBanking.paymentInstructions,
          method: finalPaymentMethod,
          transactionId,
        };
        break;

      case 'VISA_CARD':
      case 'MASTERCARD':
        // Use Khalti for card payments (recommended for Nepal)
        // Fallback to Razorpay if Khalti not available
        if (config.khalti.secretKey) {
          const khaltiPayment = await cardPaymentService.createKhaltiPayment({
            amount: finalAmount.toString(),
            purchaseOrderId: transactionId,
            purchaseOrderName: productName,
            returnUrl: successUrl || `${config.frontendUrl}/payment/success`,
          });
          paymentDetails = {
            paymentUrl: khaltiPayment.paymentUrl,
            pidx: khaltiPayment.pidx,
            method: paymentMethod,
            transactionId,
            gateway: 'khalti',
          };
        } else if (config.razorpay.keyId && config.razorpay.keySecret) {
          const razorpayOrder = await cardPaymentService.createRazorpayOrder({
            amount: finalAmount.toString(),
            currency: 'INR',
            receipt: transactionId,
            notes: {
              transactionId,
              userId,
              courseId: courseId || '',
            },
          });
          paymentDetails = {
            orderId: razorpayOrder.orderId,
            method: paymentMethod,
            transactionId,
            gateway: 'razorpay',
          };
        } else {
          throw new Error('No card payment gateway configured. Please configure Khalti or Razorpay.');
        }
        break;

      default:
        throw new Error('Unsupported payment method');
    }

    const processingTime = Date.now() - startTime;

    // Update payment with gateway details
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        processingTime,
        metadata: {
          ...metadata,
          paymentDetails,
          fraudCheck: fraudCheck ? { riskScore: fraudCheck.riskScore, riskLevel: fraudCheck.riskLevel } : null,
        },
      },
    });

    // Update user's preferred payment method if this is their first successful payment
    const userPayments = await prisma.payment.count({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    if (userPayments === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          preferredPaymentMethod: finalPaymentMethod,
        },
      });
    }

    return {
      success: true,
      paymentId: payment.id,
      transactionId,
      amount: finalAmount,
      discount: discountAmount,
      paymentMethod: finalPaymentMethod,
      paymentDetails,
      coupon: coupon ? { code: coupon.code, discount: discountAmount } : null,
    };
  } catch (error) {
    // Update payment status to failed
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        metadata: {
          error: error.message,
        },
      },
    });
    throw error;
  }
};

/**
 * Verify payment
 * @param {Object} params - Verification parameters
 * @returns {Promise<Object>} Verification result
 */
export const verifyPayment = async (params) => {
  const {
    paymentId,
    transactionId,
    paymentMethod,
    verificationData = {},
  } = params;

  // Get payment record
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { id: paymentId },
        { transactionId },
      ],
    },
    include: {
      course: true,
      order: true,
      coupon: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status === 'COMPLETED') {
    return {
      success: true,
      message: 'Payment already verified',
      payment,
    };
  }

  let verificationResult = null;

  try {
    switch (paymentMethod || payment.paymentMethod) {
      case 'ESEWA':
        // Verify eSewa callback or transaction
        if (verificationData.signature) {
          // Verify callback signature
          const isValid = esewaService.verifyEsewaCallback(verificationData);
          if (!isValid) {
            throw new Error('Invalid eSewa signature');
          }
        }
        verificationResult = await esewaService.verifyEsewaPayment(
          payment.finalAmount,
          transactionId || payment.transactionId
        );
        break;

      case 'MOBILE_BANKING':
        verificationResult = await mobileBankingService.verifyMobileBankingPayment(
          payment.transactionId,
          verificationData
        );
        // Mobile banking requires manual verification
        if (verificationResult.requiresManualVerification) {
          return {
            success: false,
            requiresManualVerification: true,
            payment,
            message: 'Mobile banking payment requires manual admin verification',
          };
        }
        break;

      case 'VISA_CARD':
      case 'MASTERCARD':
        const gateway = payment.metadata?.gateway || 'khalti';
        if (gateway === 'khalti' && verificationData.pidx) {
          verificationResult = await cardPaymentService.verifyKhaltiPayment(
            verificationData.pidx
          );
        } else if (gateway === 'razorpay' && verificationData.orderId && verificationData.paymentId && verificationData.signature) {
          verificationResult = await cardPaymentService.verifyRazorpayPayment(
            verificationData.orderId,
            verificationData.paymentId,
            verificationData.signature
          );
        } else {
          throw new Error('Invalid card payment verification data');
        }
        break;

      default:
        throw new Error('Unsupported payment method');
    }

    // Update payment status
    if (verificationResult.success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...payment.metadata,
            verificationResult,
            verifiedAt: new Date().toISOString(),
          },
          // Update method-specific fields
          ...(paymentMethod === 'ESEWA' && {
            esewaRefId: verificationResult.transactionId || payment.transactionId,
          }),
          ...(paymentMethod === 'MOBILE_BANKING' && {
            mobileBankRef: verificationResult.referenceNumber,
          }),
        },
      });

      // Apply coupon if applicable
      if (payment.couponId) {
        await applyCoupon(
          payment.couponId,
          payment.userId,
          payment.orderId,
          payment.id,
          payment.discount
        );
      }

      // If this payment was for an installment (EMI), mark installment PAID and skip enrollment
      if (payment.metadata?.installmentId) {
        await prisma.courseInstallment.update({
          where: { id: payment.metadata.installmentId },
          data: {
            status: 'PAID',
            paymentId: payment.id,
            paidAt: new Date(),
          },
        });
        return {
          success: true,
          payment: await prisma.payment.findUnique({
            where: { id: payment.id },
            include: { course: true, order: true },
          }),
        };
      }

      // Auto-enroll in course if payment is for a course (only if not already enrolled)
      if (payment.courseId) {
        const enrollment = await enrollUserInCourse(
          payment.userId,
          payment.courseId,
          payment.finalAmount,
          payment.metadata?.referralClickId
        );

        // Get course to find instructor
        const course = await prisma.course.findUnique({
          where: { id: payment.courseId },
          select: {
            id: true,
            instructorId: true,
            title: true,
          },
        });

        // Calculate instructor commission
        if (course && course.instructorId) {
          try {
            await instructorEarningService.calculateCommission(
              course.instructorId,
              payment.courseId,
              payment.id,
              enrollment.id,
              payment.finalAmount
            );
          } catch (error) {
            // Log error but don't fail payment
            console.error('Instructor commission calculation failed:', error);
            await auditLogService.createAuditLog({
              userId: payment.userId,
              action: 'INSTRUCTOR_COMMISSION_ERROR',
              entityType: 'PAYMENT',
              entityId: payment.id,
              description: `Failed to calculate instructor commission: ${error.message}`,
            });
          }
        }

        // Calculate affiliate commission if enrollment has affiliate
        if (enrollment && enrollment.affiliateId) {
          try {
            await affiliateService.calculateCommission(
              enrollment.id,
              payment.courseId,
              payment.finalAmount
            );
          } catch (error) {
            // Log error but don't fail payment
            console.error('Affiliate commission calculation failed:', error);
            await auditLogService.createAuditLog({
              userId: payment.userId,
              action: 'AFFILIATE_COMMISSION_ERROR',
              entityType: 'PAYMENT',
              entityId: payment.id,
              description: `Failed to calculate affiliate commission: ${error.message}`,
            });
          }
        }
      }

      // Handle order payment confirmation
      if (payment.orderId) {
        try {
          await confirmOrderPayment(payment.orderId);
        } catch (error) {
          console.error('Order confirmation failed:', error);
          // Log but don't fail payment - admin can manually confirm
          await auditLogService.createAuditLog({
            userId: payment.userId,
            action: 'ORDER_CONFIRMATION_ERROR',
            entityType: 'PAYMENT',
            entityId: payment.id,
            description: `Failed to confirm order after payment: ${error.message}`,
          });
        }
      }

      return {
        success: true,
        payment: await prisma.payment.findUnique({
          where: { id: payment.id },
          include: {
            course: true,
            order: true,
          },
        }),
      };
    } else {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          metadata: {
            ...payment.metadata,
            verificationError: verificationResult.message,
          },
        },
      });

      return {
        success: false,
        message: verificationResult.message || 'Payment verification failed',
        payment,
      };
    }
  } catch (error) {
    // Update payment with error
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        metadata: {
          ...payment.metadata,
          error: error.message,
        },
      },
    });
    throw error;
  }
};

/**
 * Helper: Enroll user in course after payment verification
 * Note: Enrollments are only created after successful payment - no PENDING state
 */
const enrollUserInCourse = async (userId, courseId, amount = null, referralClickId = null) => {
  // Check if already enrolled (shouldn't happen, but handle gracefully)
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    include: {
      affiliate: true,
    },
  });

  if (existingEnrollment) {
    return existingEnrollment;
  }

  // Create new enrollment with ACTIVE status (only called after payment verification)
  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: 'ACTIVE',
    },
    include: {
      affiliate: true,
    },
  });

  // Update course enrollment count
  await prisma.course.update({
    where: { id: courseId },
    data: {
      totalEnrollments: {
        increment: 1,
      },
    },
  });

  // Process referral conversion if referral click ID is provided
  if (referralClickId) {
    try {
      const { processReferralConversion } = await import('../services/referralService.js');
      await processReferralConversion(userId, courseId, enrollment.id, referralClickId);
    } catch (error) {
      console.error('Error processing referral conversion:', error);
      // Don't fail enrollment if referral processing fails
    }
  }

  return enrollment;
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (paymentId) => {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      course: true,
      order: true,
      coupon: true,
    },
  });
};

/**
 * Process refund (full or partial)
 */
export const processRefund = async (paymentId, refundAmount = null, reason = null) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'COMPLETED') {
    throw new Error('Only completed payments can be refunded');
  }

  // If no amount specified, full refund
  const refundAmountDecimal = refundAmount
    ? parseFloat(refundAmount)
    : parseFloat(payment.finalAmount.toString());

  if (refundAmountDecimal <= 0 || refundAmountDecimal > parseFloat(payment.finalAmount.toString())) {
    throw new Error('Invalid refund amount');
  }

  // Check if partial refund
  const isPartialRefund = refundAmountDecimal < parseFloat(payment.finalAmount.toString());
  const remainingAmount = parseFloat(payment.finalAmount.toString()) - refundAmountDecimal;

  // Update payment status
  const updateData = {
    status: isPartialRefund ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
    metadata: {
      ...payment.metadata,
      refundedAt: new Date().toISOString(),
      refundAmount: refundAmountDecimal,
      refundReason: reason,
      isPartialRefund,
      remainingAmount: isPartialRefund ? remainingAmount : 0,
    },
  };

  // For partial refunds, create a new payment record for remaining amount
  if (isPartialRefund) {
    // Update original payment
    await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
    });
  } else {
    // Full refund
    await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
    });
  }

  // TODO: Process actual refund through payment gateway
  // This depends on the payment gateway's refund API

  return {
    success: true,
    refundAmount: refundAmountDecimal,
    isPartialRefund,
    payment: await prisma.payment.findUnique({ where: { id: paymentId } }),
  };
};

/**
 * Retry failed payment
 */
export const retryPayment = async (paymentId, paymentMethod = null) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'FAILED') {
    throw new Error('Only failed payments can be retried');
  }

  // Check retry count
  const retryRecord = await prisma.paymentRetry.findFirst({
    where: { paymentId },
  });

  const currentRetries = retryRecord?.retryCount || 0;
  const maxRetries = retryRecord?.maxRetries || 3;

  if (currentRetries >= maxRetries) {
    throw new Error(`Maximum retry attempts (${maxRetries}) reached`);
  }

  // Update retry count
  await prisma.paymentRetry.upsert({
    where: { id: retryRecord?.id || 'new' },
    create: {
      paymentId,
      retryCount: 1,
      maxRetries,
      reason: 'Payment retry',
    },
    update: {
      retryCount: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  // Update payment retry count
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      retryCount: currentRetries + 1,
      status: 'PENDING',
    },
  });

  // Initiate new payment with same details
  const newPayment = await initiatePayment({
    userId: payment.userId,
    amount: payment.amount.toString(),
    paymentMethod: paymentMethod || payment.paymentMethod,
    courseId: payment.courseId,
    orderId: payment.orderId,
    productName: payment.metadata?.productName || 'Course/Product Payment',
  });

  return {
    success: true,
    retryCount: currentRetries + 1,
    newPayment,
  };
};

export default {
  initiatePayment,
  verifyPayment,
  getPaymentById,
  processRefund,
  retryPayment,
};



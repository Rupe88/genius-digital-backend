import express from 'express';
import {
  initiatePayment,
  verifyPayment,
  verifyPaymentCallback,
  esewaWebhook,
  khaltiWebhook,
  getPayment,
  getUserPayments,
  refundPayment,
  getAvailableGateways,
  retryPayment,
  getAllPaymentsAdmin,
} from '../controllers/paymentController.js';
import {
  getPaymentAnalytics,
  getPaymentTrends,
  getTopPaymentMethods,
} from '../controllers/paymentAnalyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Public routes (webhooks don't require auth but need signature verification)
router.post('/webhook/esewa', esewaWebhook);
router.post('/webhook/khalti', khaltiWebhook);

// Public: verify payment from success page (eSewa redirect; no auth, verified by signature)
router.post('/verify-callback', verifyPaymentCallback);

// Public route - Get available payment gateways
router.get('/gateways', getAvailableGateways);

// Authenticated routes
router.post(
  '/initiate',
  authenticate,
  [
    body('amount')
      .toFloat()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('paymentMethod')
      .isIn(['ESEWA', 'MOBILE_BANKING', 'VISA_CARD', 'MASTERCARD'])
      .withMessage('Invalid payment method'),
    body('courseId')
      .optional()
      .isUUID()
      .withMessage('Invalid course ID format'),
    body('orderId')
      .optional()
      .isUUID()
      .withMessage('Invalid order ID format'),
    body('couponCode')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Coupon code must be between 3 and 50 characters'),
    body('productIds')
      .optional()
      .isArray()
      .withMessage('Product IDs must be an array'),
    body('productName')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Product name must be less than 255 characters'),
    body('successUrl')
      .optional({ checkFalsy: true })
      .trim()
      .custom((value) => !value || value.startsWith('http://') || value.startsWith('https://'))
      .withMessage('Invalid success URL format'),
    body('failureUrl')
      .optional({ checkFalsy: true })
      .trim()
      .custom((value) => !value || value.startsWith('http://') || value.startsWith('https://'))
      .withMessage('Invalid failure URL format'),
    body('installmentId')
      .optional()
      .isUUID()
      .withMessage('Invalid installment ID format'),
  ],
  initiatePayment
);

router.post(
  '/verify',
  authenticate,
  [
    body('paymentId')
      .optional()
      .isUUID()
      .withMessage('Invalid payment ID format'),
    body('transactionId')
      .optional()
      .isString()
      .withMessage('Transaction ID is required if payment ID is not provided'),
    body('paymentMethod')
      .optional()
      .isIn(['ESEWA', 'MOBILE_BANKING', 'VISA_CARD', 'MASTERCARD'])
      .withMessage('Invalid payment method'),
  ],
  verifyPayment
);

router.get(
  '/',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
  ],
  getUserPayments
);

router.get(
  '/admin',
  authenticate,
  requireAdmin,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('status')
      .optional()
      .isIn(['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'])
      .withMessage('Invalid status filter'),
    query('search')
      .optional()
      .isString()
      .withMessage('Search must be a string'),
  ],
  getAllPaymentsAdmin
);

router.get(
  '/:paymentId',
  authenticate,
  [
    param('paymentId')
      .isUUID()
      .withMessage('Invalid payment ID format'),
  ],
  getPayment
);

// Payment analytics routes (Admin)
router.get(
  '/analytics',
  authenticate,
  requireAdmin,
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    query('paymentMethod').optional().isIn(['ESEWA', 'MOBILE_BANKING', 'VISA_CARD', 'MASTERCARD']),
  ],
  getPaymentAnalytics
);

router.get(
  '/analytics/trends',
  authenticate,
  requireAdmin,
  [
    query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
  ],
  getPaymentTrends
);

router.get(
  '/analytics/methods',
  authenticate,
  requireAdmin,
  [
    query('limit').optional().isInt({ min: 1, max: 20 }).toInt(),
  ],
  getTopPaymentMethods
);

// Payment retry route
router.post(
  '/:paymentId/retry',
  authenticate,
  [
    param('paymentId').isUUID().withMessage('Invalid payment ID format'),
    body('paymentMethod')
      .optional()
      .isIn(['ESEWA', 'MOBILE_BANKING', 'VISA_CARD', 'MASTERCARD']),
  ],
  retryPayment
);

// Admin only routes
router.post(
  '/:paymentId/refund',
  authenticate,
  requireAdmin,
  [
    param('paymentId')
      .isUUID()
      .withMessage('Invalid payment ID format'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters'),
    body('refundAmount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Refund amount must be greater than 0'),
  ],
  refundPayment
);

export default router;


import express from 'express';
import {
  getPaymentAnalytics,
  getPaymentTrends,
  getTopPaymentMethods,
} from '../controllers/paymentAnalyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { query } from 'express-validator';

const router = express.Router();

// Admin only routes
router.get(
  '/',
  authenticate,
  requireAdmin,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('paymentMethod').optional().isIn(['MANUAL_QR', 'ESEWA', 'MOBILE_BANKING', 'VISA_CARD', 'MASTERCARD', 'OTHER']),
  ],
  getPaymentAnalytics
);

router.get(
  '/trends',
  authenticate,
  requireAdmin,
  [query('days').optional().isInt({ min: 1, max: 365 })],
  getPaymentTrends
);

router.get(
  '/top-methods',
  authenticate,
  requireAdmin,
  [query('limit').optional().isInt({ min: 1, max: 20 })],
  getTopPaymentMethods
);

export default router;

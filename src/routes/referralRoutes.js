import express from 'express';
import {
  generateSharingLinks,
  trackReferralClick,
  trackReferralClickAjax,
  getReferralStats,
  getReferralLinks,
  getReferralAnalytics,
  getReferralConversions,
  markCommissionsAsPaid,
  deactivateReferralLink,
  reactivateReferralLink,
} from '../controllers/referralController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validators.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/click/:referralCode', trackReferralClick);
router.post('/track', trackReferralClickAjax);

// Authenticated routes
router.use(authenticate);

// Generate sharing links for a course
router.get(
  '/share/:courseId',
  [
    param('courseId').isUUID(),
  ],
  generateSharingLinks
);

// Get user's referral statistics
router.get('/stats', getReferralStats);

// Get user's referral links
router.get(
  '/links',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getReferralLinks
);

// Deactivate referral link
router.patch(
  '/links/:linkId/deactivate',
  [
    param('linkId').isUUID(),
  ],
  deactivateReferralLink
);

// Reactivate referral link
router.patch(
  '/links/:linkId/reactivate',
  [
    param('linkId').isUUID(),
  ],
  reactivateReferralLink
);

// Admin routes
router.get(
  '/admin/analytics',
  requireAdmin,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['PENDING', 'PAID']),
  ],
  getReferralAnalytics
);

router.get(
  '/admin/conversions',
  requireAdmin,
  [
    query('status').optional().isIn(['PENDING', 'PAID']),
    query('isFraudulent').optional().isIn(['true', 'false']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getReferralConversions
);

router.post(
  '/admin/commissions/mark-paid',
  requireAdmin,
  [
    body('conversionIds').isArray().withMessage('Conversion IDs array is required'),
    body('conversionIds.*').isUUID(),
  ],
  markCommissionsAsPaid
);

export default router;

import express from 'express';
import {
  validateCouponCode,
  getActiveCoupons,
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Validate promo/coupon code (optional auth so userLimit is enforced when logged in)
router.post(
  '/validate',
  optionalAuthenticate,
  [
    body('code').notEmpty().trim().isString(),
    body('amount').isFloat({ min: 0 }),
    body('courseId').optional().isUUID(),
    body('productIds').optional().isArray(),
  ],
  validateCouponCode
);

router.get('/active', getActiveCoupons);

// Admin routes
router.get(
  '/admin',
  authenticate,
  requireAdmin,
  [
    query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'EXPIRED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  getAllCoupons
);

router.get(
  '/:id',
  [param('id').isUUID()],
  getCouponById
);

router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('code').notEmpty().trim().isLength({ min: 3, max: 50 }),
    body('description').optional().isString(),
    body('couponType').isIn(['PERCENTAGE', 'FIXED_AMOUNT']),
    body('discountValue').isFloat({ min: 0 }),
    body('minPurchase').optional().isFloat({ min: 0 }),
    body('maxDiscount').optional().isFloat({ min: 0 }),
    body('usageLimit').optional().isInt({ min: 1 }),
    body('userLimit').optional().isInt({ min: 1 }),
    body('validFrom').isISO8601(),
    body('validUntil').isISO8601(),
    body('applicableCourses').optional().isArray(),
    body('applicableProducts').optional().isArray(),
  ],
  createCoupon
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID(),
    body('code').optional().trim().isLength({ min: 3, max: 50 }),
    body('description').optional().isString(),
    body('couponType').optional().isIn(['PERCENTAGE', 'FIXED_AMOUNT']),
    body('discountValue').optional().isFloat({ min: 0 }),
    body('minPurchase').optional().isFloat({ min: 0 }),
    body('maxDiscount').optional().isFloat({ min: 0 }),
    body('usageLimit').optional().isInt({ min: 1 }),
    body('userLimit').optional().isInt({ min: 1 }),
    body('validFrom').optional({ checkFalsy: true }).trim().custom((val) => !val || !Number.isNaN(Date.parse(val))).withMessage('validFrom must be a valid date'),
    body('validUntil').optional({ checkFalsy: true }).trim().custom((val) => !val || !Number.isNaN(Date.parse(val))).withMessage('validUntil must be a valid date'),
    body('applicableCourses').optional().isArray(),
    body('applicableProducts').optional().isArray(),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'EXPIRED']),
  ],
  updateCoupon
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteCoupon
);

export default router;



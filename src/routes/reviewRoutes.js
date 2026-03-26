import express from 'express';
import {
  createReview,
  getCourseReviews,
  getUserReview,
  deleteReview,
  getAllReviewsAdmin,
  moderateReview,
  updateReviewAdmin,
  deleteReviewAdmin,
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validators.js';

const router = express.Router();

// Admin routes
router.get(
  '/',
  authenticate,
  requireAdmin,
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('approved').optional().isBoolean(),
    query('search').optional().isString().trim(),
    query('q').optional().isString().trim(),
  ]),
  getAllReviewsAdmin
);

router.patch(
  '/:id/moderate',
  authenticate,
  requireAdmin,
  validate([
    param('id').isUUID().withMessage('Invalid review ID'),
    body('isApproved').isBoolean().withMessage('isApproved must be true or false'),
  ]),
  moderateReview
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate([
    param('id').isUUID().withMessage('Invalid review ID'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5'),
    body('comment').optional().isString(),
    body('isApproved').optional().isBoolean(),
  ]),
  updateReviewAdmin
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate([param('id').isUUID().withMessage('Invalid review ID')]),
  deleteReviewAdmin
);

// Public routes
router.get(
  '/course/:courseId',
  validate([
    param('courseId').isUUID().withMessage('Invalid course ID'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  getCourseReviews
);

// Authenticated routes
router.post(
  '/course/:courseId',
  authenticate,
  validate([
    param('courseId').isUUID().withMessage('Invalid course ID'),
    body('rating')
      .custom((value) => Number(value) === 5)
      .withMessage('Only 5-star reviews are allowed'),
    body('comment').optional().trim().isLength({ max: 1000 }),
  ]),
  createReview
);

router.get(
  '/course/:courseId/my-review',
  authenticate,
  validate([param('courseId').isUUID().withMessage('Invalid course ID')]),
  getUserReview
);

router.delete(
  '/course/:courseId',
  authenticate,
  validate([param('courseId').isUUID().withMessage('Invalid course ID')]),
  deleteReview
);

export default router;

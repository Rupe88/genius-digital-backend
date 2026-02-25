import express from 'express';
import {
  enrollInCourse,
  getUserEnrollments,
  getEnrollmentById,
  unenrollFromCourse,
  getAllEnrollments,
  deleteEnrollment,
  adminGrantEnrollment,
} from '../controllers/enrollmentController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// User routes
router.post(
  '/',
  authenticate,
  [
    body('courseId').notEmpty().isUUID(),
    body('affiliateCode').optional().isString(),
  ],
  enrollInCourse
);

router.get(
  '/my-enrollments',
  authenticate,
  [
    query('status').optional().isIn(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getUserEnrollments
);

router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  getEnrollmentById
);

router.delete(
  '/course/:courseId',
  authenticate,
  [param('courseId').isUUID()],
  unenrollFromCourse
);

// Admin routes
router.post(
  '/admin/grant',
  authenticate,
  requireAdmin,
  [
    body('userId').notEmpty().isUUID(),
    body('courseId').notEmpty().isUUID(),
  ],
  adminGrantEnrollment
);

router.get(
  '/',
  authenticate,
  requireAdmin,
  [
    query('status').optional().isIn(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
    query('courseId').optional().isUUID(),
    query('userId').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getAllEnrollments
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteEnrollment
);

export default router;



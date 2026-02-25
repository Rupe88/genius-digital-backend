import express from 'express';
import {
  getPlanByCourse,
  getPlanByCourseAdmin,
  upsertPlan,
  deletePlan,
  startInstallmentEnrollment,
  getMyInstallments,
} from '../controllers/installmentController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Public: get active plan for a course (for course page)
router.get(
  '/plan/course/:courseId',
  [param('courseId').isUUID().withMessage('Invalid course ID')],
  getPlanByCourse
);

// Authenticated user routes
router.post(
  '/start',
  authenticate,
  [body('courseId').isUUID().withMessage('courseId must be a valid UUID')],
  startInstallmentEnrollment
);

router.get(
  '/me',
  authenticate,
  [
    query('status').optional().isIn(['PENDING', 'PAID', 'OVERDUE']),
    query('courseId').optional().isUUID(),
  ],
  getMyInstallments
);

// Admin: plan CRUD by course
router.get(
  '/admin/plan/course/:courseId',
  authenticate,
  requireAdmin,
  [param('courseId').isUUID().withMessage('Invalid course ID')],
  getPlanByCourseAdmin
);

router.put(
  '/admin/plan/course/:courseId',
  authenticate,
  requireAdmin,
  [
    param('courseId').isUUID().withMessage('Invalid course ID'),
    body('numberOfInstallments').optional().isInt({ min: 1, max: 12 }).toInt(),
    body('intervalMonths').optional().isInt({ min: 1, max: 12 }).toInt(),
    body('minAmountForPlan').optional().isFloat({ min: 0 }).toFloat(),
    body('isActive').optional().isBoolean(),
  ],
  upsertPlan
);

router.delete(
  '/admin/plan/course/:courseId',
  authenticate,
  requireAdmin,
  [param('courseId').isUUID().withMessage('Invalid course ID')],
  deletePlan
);

export default router;

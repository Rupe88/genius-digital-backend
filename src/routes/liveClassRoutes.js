import express from 'express';
import {
  getAllLiveClasses,
  getLiveClassById,
  createLiveClass,
  updateLiveClass,
  cancelLiveClassSeries,
  deleteLiveClass,
  enrollInLiveClass,
  markAttendance,
  getMyLiveClasses,
  getMyAvailableLiveClasses,
} from '../controllers/liveClassController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validators.js';

const router = express.Router();

// Public routes
router.get(
  '/',
  validate([
    query('status').optional().isIn(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']),
    query('instructorId').optional().isUUID(),
    query('courseId').optional().isUUID(),
    query('upcoming').optional().isBoolean(),
    query('search').optional().isString().trim(),
    query('q').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  getAllLiveClasses
);

// Authenticated route - must be defined before /:id to avoid route conflict
router.get(
  '/my-available',
  authenticate,
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  getMyAvailableLiveClasses
);

// Public route - must be after specific routes to avoid conflicts
router.get(
  '/:id',
  validate([param('id').isUUID()]),
  getLiveClassById
);

// Authenticated routes
router.use(authenticate);

// Get user's live classes
router.get('/me/enrollments', getMyLiveClasses);

// Enroll in live class
router.post(
  '/:id/enroll',
  validate([param('id').isUUID()]),
  enrollInLiveClass
);

// Mark attendance
router.post(
  '/:id/attendance/:userId',
  validate([
    param('id').isUUID(),
    param('userId').isUUID(),
  ]),
  markAttendance
);

// Admin routes
router.post(
  '/',
  requireAdmin,
  validate([
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('instructorId').isUUID().withMessage('Valid instructor ID is required'),
    body('recurrenceType').isIn(['WEEKLY']).withMessage('Only weekly recurrence is supported'),
    body('startDate')
      .notEmpty()
      .isISO8601()
      .withMessage('startDate must be a valid date'),
    body('startTime')
      .notEmpty()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('startTime must be in HH:mm format'),
    body('daysOfWeek')
      .optional()
      .isArray({ min: 1 })
      .withMessage('daysOfWeek must be a non-empty array'),
    body('daysOfWeek.*')
      .optional()
      .isInt({ min: 0, max: 6 })
      .withMessage('daysOfWeek values must be between 0 and 6'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
    body('description').optional().isString(),
    body('adminNotes').optional().isString(),
    body('courseId').optional({ checkFalsy: true }).isUUID(),
    body('meetingUrl')
      .optional({ checkFalsy: true })
      .isURL({ require_protocol: true })
      .withMessage('meetingUrl must be a valid URL (example: https://zoom.us/j/123456789)'),
    body('meetingId').optional({ checkFalsy: true }).isString(),
    body('meetingPassword').optional({ checkFalsy: true }).isString(),
    body('meetingProvider').optional({ checkFalsy: true }).isIn(['ZOOM']),
    body('autoGenerateMeeting').optional().isBoolean(),
    body('hostEmail').optional({ checkFalsy: true }).isEmail(),
  ]),
  createLiveClass
);

router.put(
  '/:id',
  requireAdmin,
  validate([
    param('id').isUUID(),
    body('title').optional().notEmpty().trim(),
    body('instructorId').optional().isUUID(),
    body('scheduledAt').optional().isISO8601(),
    body('duration').optional().isInt({ min: 1 }),
    body('description').optional().isString(),
    body('adminNotes').optional().isString(),
    body('courseId').optional({ checkFalsy: true }).isUUID(),
    body('meetingUrl')
      .optional({ checkFalsy: true })
      .isURL({ require_protocol: true })
      .withMessage('meetingUrl must be a valid URL (example: https://zoom.us/j/123456789)'),
    body('meetingId').optional({ checkFalsy: true }).isString(),
    body('meetingPassword').optional({ checkFalsy: true }).isString(),
    body('meetingProvider').optional({ checkFalsy: true }).isIn(['ZOOM']),
    body('autoGenerateMeeting').optional().isBoolean(),
    body('hostEmail').optional({ checkFalsy: true }).isEmail(),
    body('recordingUrl').optional({ checkFalsy: true }).isURL(),
    body('status').optional().isIn(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']),
  ]),
  updateLiveClass
);

router.post(
  '/series/:seriesId/cancel',
  requireAdmin,
  validate([
    param('seriesId').isString().trim().notEmpty(),
  ]),
  cancelLiveClassSeries
);

router.delete(
  '/:id',
  requireAdmin,
  validate([param('id').isUUID()]),
  deleteLiveClass
);

export default router;


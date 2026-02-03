import express from 'express';
import {
  getAllLiveClasses,
  getLiveClassById,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
  enrollInLiveClass,
  markAttendance,
  getMyLiveClasses,
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
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  getAllLiveClasses
);

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
    body('scheduledAt').isISO8601().withMessage('Valid scheduled date is required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
    body('description').optional().isString(),
    body('courseId').optional({ checkFalsy: true }).isUUID(),
    body('meetingUrl').optional({ checkFalsy: true }).isURL(),
    body('meetingId').optional({ checkFalsy: true }).isString(),
    body('meetingPassword').optional({ checkFalsy: true }).isString(),
    body('meetingProvider').optional({ checkFalsy: true }).isIn(['ZOOM', 'GOOGLE_MEET', 'OTHER']),
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
    body('courseId').optional({ checkFalsy: true }).isUUID(),
    body('meetingUrl').optional({ checkFalsy: true }).isURL(),
    body('meetingId').optional({ checkFalsy: true }).isString(),
    body('meetingPassword').optional({ checkFalsy: true }).isString(),
    body('meetingProvider').optional({ checkFalsy: true }).isIn(['ZOOM', 'GOOGLE_MEET', 'OTHER']),
    body('autoGenerateMeeting').optional().isBoolean(),
    body('hostEmail').optional({ checkFalsy: true }).isEmail(),
    body('recordingUrl').optional({ checkFalsy: true }).isURL(),
    body('status').optional().isIn(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']),
  ]),
  updateLiveClass
);

router.delete(
  '/:id',
  requireAdmin,
  validate([param('id').isUUID()]),
  deleteLiveClass
);

export default router;


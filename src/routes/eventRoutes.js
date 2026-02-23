import express from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getEventRegistrations,
  getAllEventRegistrations,
  markEventAttendance,
} from '../controllers/eventController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { optionalSingleUpload, processImageUpload } from '../middleware/cloudinaryUpload.js';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validators.js';

const router = express.Router();

const listEventsQueryValidation = [
  query('status').optional().isIn(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']),
  query('featured').optional().isIn(['true', 'false']),
  query('upcoming').optional().isIn(['true', 'false']),
  query('past').optional().isIn(['true', 'false']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

// Public: list events (no auth, fast)
router.get('/', validate(listEventsQueryValidation), getAllEvents);

router.get('/:id', validate([param('id').notEmpty()]), getEventById);

// Public/optional-auth: register for event (guests send name, email, phone)
router.post(
  '/:id/register',
  optionalAuthenticate,
  validate([
    param('id').isUUID(),
    body('name').optional().isString().trim(),
    body('email').optional().isEmail(),
    body('phone').optional().isString().trim(),
    body('referralSource').optional().isString().trim(),
    body('message').optional().isString().trim(),
  ]),
  registerForEvent
);

// Admin: all event registrations (must be before /:id)
router.get(
  '/admin/registrations',
  authenticate,
  requireAdmin,
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim(),
    query('q').optional().isString().trim(),
    query('eventId').optional().isUUID(),
    query('referralSource').optional().isString().trim(),
  ]),
  getAllEventRegistrations
);

// Admin routes
router.get(
  '/:id/registrations',
  authenticate,
  requireAdmin,
  validate([
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  getEventRegistrations
);

router.get(
  '/:id/attendance/:registrationId',
  authenticate,
  requireAdmin,
  validate([
    param('id').isUUID(),
    param('registrationId').isUUID(),
  ]),
  markEventAttendance
);

router.post(
  '/',
  authenticate,
  requireAdmin,
  optionalSingleUpload('image', processImageUpload),
  validate([
    body('title').notEmpty().trim().withMessage('Event title is required'),
    body('slug').optional().trim(),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').optional({ checkFalsy: true }).isISO8601().withMessage('Valid end date is required'),
    body('description').optional().isString(),
    body('shortDescription').optional().isString(),
    body('location').optional().isString(),
    body('venue').optional().isString(),
    body('price').optional().isFloat({ min: 0 }),
    body('isFree').optional().isBoolean(),
    body('maxAttendees').optional().isInt({ min: 1 }),
    body('featured').optional().isBoolean(),
  ]),
  createEvent
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  optionalSingleUpload('image', processImageUpload),
  validate([
    param('id').isUUID(),
    body('title').optional().notEmpty().trim(),
    body('slug').optional().notEmpty().trim(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional({ checkFalsy: true }).isISO8601(),
    body('description').optional().isString(),
    body('shortDescription').optional().isString(),
    body('location').optional().isString(),
    body('venue').optional().isString(),
    body('price').optional().isFloat({ min: 0 }),
    body('isFree').optional().isBoolean(),
    body('maxAttendees').optional().isInt({ min: 1 }),
    body('status').optional().isIn(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']),
    body('featured').optional().isBoolean(),
  ]),
  updateEvent
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate([param('id').isUUID()]),
  deleteEvent
);

export default router;

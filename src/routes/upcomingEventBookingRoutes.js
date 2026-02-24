import express from 'express';
import { createBooking, getAllBookings } from '../controllers/upcomingEventBookingController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, query } from 'express-validator';
import { validate } from '../utils/validators.js';

const router = express.Router();

// Public: submit Book Now form
router.post(
  '/',
  validate([
    body('eventId').optional().isUUID(),
    body('courseId').optional().isUUID(),
    body('name').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().trim().isLength({ min: 1, max: 50 }).withMessage('Phone is required'),
    body('referralSource').optional().trim().isLength({ max: 100 }),
    body('message').optional().trim(),
  ]),
  createBooking
);

// Admin: list all bookings
router.get(
  '/',
  authenticate,
  requireAdmin,
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim(),
    query('q').optional().isString().trim(),
    query('type').optional().isIn(['EVENT', 'COURSE']),
    query('referralSource').optional().isString().trim(),
  ]),
  getAllBookings
);

export default router;

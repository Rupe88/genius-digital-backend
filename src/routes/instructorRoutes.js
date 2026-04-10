import express from 'express';
import {
  getAllInstructors,
  getInstructorById,
  getMyInstructorCourses,
  createInstructor,
  updateInstructor,
  deleteInstructor,
} from '../controllers/instructorController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireInstructorOrAdmin } from '../middleware/role.js';
import { singleUpload, processImageUpload } from '../middleware/cloudinaryUpload.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Public routes
router.get(
  '/',
  [
    query('featured').optional().isBoolean(),
  ],
  getAllInstructors
);

router.get(
  '/my/courses',
  authenticate,
  requireInstructorOrAdmin,
  getMyInstructorCourses
);

router.get(
  '/:id',
  [
    param('id').notEmpty(),
  ],
  getInstructorById
);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  singleUpload('image'),
  processImageUpload,
  [
    body('name').notEmpty().trim().isLength({ min: 1, max: 255 }),
    body('slug').optional().trim().isLength({ min: 1, max: 255 }),
    body('image').optional().isString().isURL(),
    body('bio').optional().isString(),
    body('designation').optional().trim().isLength({ max: 255 }),
    body('specialization').optional().trim().isLength({ max: 500 }),
    body('email').optional().isEmail(),
    body('phone').optional().isString(),
    body('socialLinks').optional().isJSON(),
    body('featured').optional().isBoolean(),
    body('order').optional().isInt(),
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }),
    body('bankName').optional().trim().isLength({ max: 255 }),
    body('accountNumber').optional().trim().isLength({ max: 100 }),
    body('ifscCode').optional().trim().isLength({ max: 50 }),
    body('panNumber').optional().trim().isLength({ max: 50 }),
  ],
  createInstructor
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  singleUpload('image'),
  processImageUpload,
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 255 }),
    body('slug').optional().trim().isLength({ min: 1, max: 255 }),
    body('image').optional().isString().isURL(),
    body('bio').optional().isString(),
    body('designation').optional().trim().isLength({ max: 255 }),
    body('specialization').optional().trim().isLength({ max: 500 }),
    body('email').optional().isEmail(),
    body('phone').optional().isString(),
    body('socialLinks').optional().isJSON(),
    body('featured').optional().isBoolean(),
    body('order').optional().isInt(),
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }),
    body('bankName').optional().trim().isLength({ max: 255 }),
    body('accountNumber').optional().trim().isLength({ max: 100 }),
    body('ifscCode').optional().trim().isLength({ max: 50 }),
    body('panNumber').optional().trim().isLength({ max: 50 }),
  ],
  updateInstructor
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID(),
  ],
  deleteInstructor
);

export default router;



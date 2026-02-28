import express from 'express';
import {
  getSuccessStories,
  getSuccessStoryById,
  createSuccessStory,
  updateSuccessStory,
  deleteSuccessStory,
} from '../controllers/studentSuccessController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { optionalSingleUpload, processImageUpload } from '../middleware/cloudinaryUpload.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Public routes
router.get(
  '/',
  [
    query('featured').optional().isBoolean(),
    query('courseId').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getSuccessStories
);

router.get(
  '/:id',
  [param('id').isUUID()],
  getSuccessStoryById
);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  optionalSingleUpload('studentImage', processImageUpload),
  [
    body('studentName').notEmpty().trim().isLength({ min: 1, max: 255 }),
    body('studentImage').optional().isString(),
    body('videoUrl').optional().trim().isLength({ max: 500 }),
    body('courseId').optional().isUUID(),
    body('title').notEmpty().trim().isLength({ min: 1, max: 255 }),
    body('story').notEmpty().isString(),
    body('achievement').optional().trim().isLength({ max: 255 }),
    body('company').optional().trim().isLength({ max: 255 }),
    body('position').optional().trim().isLength({ max: 255 }),
    body('testimonial').optional().isString(),
    body('isPublished').optional().isBoolean(),
    body('featured').optional().isBoolean(),
    body('order').optional().isInt(),
  ],
  createSuccessStory
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  optionalSingleUpload('studentImage', processImageUpload),
  [
    param('id').isUUID(),
    body('studentName').optional().trim().isLength({ min: 1, max: 255 }),
    body('studentImage').optional().isString(),
    body('videoUrl').optional().trim().isLength({ max: 500 }),
    body('courseId').optional().isUUID(),
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('story').optional().isString(),
    body('achievement').optional().trim().isLength({ max: 255 }),
    body('company').optional().trim().isLength({ max: 255 }),
    body('position').optional().trim().isLength({ max: 255 }),
    body('testimonial').optional().isString(),
    body('isPublished').optional().isBoolean(),
    body('featured').optional().isBoolean(),
    body('order').optional().isInt(),
  ],
  updateSuccessStory
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteSuccessStory
);

export default router;



import express from 'express';
import {
  getCourseChapters,
  getChapterById,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  toggleLock,
  togglePreview,
} from '../controllers/chapterController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param } from 'express-validator';

const router = express.Router();

// Public/User routes
router.get(
  '/course/:courseId',
  getCourseChapters
);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid chapter ID')],
  getChapterById
);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('courseId').notEmpty().isUUID().withMessage('Course ID is required'),
    body('title').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Title is required (max 255 characters)'),
    body('slug').optional().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString(),
    body('order').optional().isInt({ min: 0 }),
    body('isLocked').optional().isBoolean(),
    body('isPreview').optional().isBoolean(),
  ],
  createChapter
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid chapter ID'),
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('slug').optional().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString(),
    body('order').optional().isInt({ min: 0 }),
    body('isLocked').optional().isBoolean(),
    body('isPreview').optional().isBoolean(),
  ],
  updateChapter
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID().withMessage('Invalid chapter ID')],
  deleteChapter
);

router.post(
  '/:id/reorder',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid chapter ID'),
    body('order').notEmpty().isInt({ min: 0 }).withMessage('Order is required and must be a positive integer'),
  ],
  reorderChapters
);

router.post(
  '/:id/toggle-lock',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid chapter ID'),
    body('isLocked').optional().isBoolean(),
  ],
  toggleLock
);

router.post(
  '/:id/toggle-preview',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid chapter ID'),
    body('isPreview').optional().isBoolean(),
  ],
  togglePreview
);

export default router;


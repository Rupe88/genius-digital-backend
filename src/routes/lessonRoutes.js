import express from 'express';
import {
  getCourseLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../controllers/lessonController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { fieldsUpload, processLessonFiles } from '../middleware/cloudinaryUpload.js';
import { body, param } from 'express-validator';

const router = express.Router();

// Public routes (course lessons list can be used for landing page; optional auth for progress)
router.get('/course/:courseId', getCourseLessons);
// Single lesson requires auth so we can verify enrollment
router.get('/:id', authenticate, [param('id').isUUID()], getLessonById);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  fieldsUpload([
    { name: 'video', maxCount: 1 },
    { name: 'attachment', maxCount: 1 },
  ]),
  processLessonFiles,
  [
    body('courseId').notEmpty().isUUID(),
    body('chapterId').optional().isUUID(),
    body('title').notEmpty().trim().isLength({ min: 1, max: 255 }),
    body('slug').optional().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString(),
    body('content').optional().isString(),
    body('videoUrl').optional().isString(),
    body('videoDuration').optional().isInt({ min: 0 }),
    body('attachmentUrl').optional().isString(),
    body('lessonType').optional().isIn(['VIDEO', 'TEXT', 'PDF', 'QUIZ', 'ASSIGNMENT']),
    body('order').optional().isInt(),
    body('isPreview').optional().isBoolean(),
    body('isLocked').optional().isBoolean(),
    body('unlockRequirement').optional(),
  ],
  createLesson
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  fieldsUpload([
    { name: 'video', maxCount: 1 },
    { name: 'attachment', maxCount: 1 },
  ]),
  processLessonFiles,
  [
    param('id').isUUID(),
    body('chapterId').optional().isUUID(),
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('slug').optional().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString(),
    body('content').optional().isString(),
    body('videoUrl').optional().isString(),
    body('videoDuration').optional().isInt({ min: 0 }),
    body('attachmentUrl').optional().isString(),
    body('lessonType').optional().isIn(['VIDEO', 'TEXT', 'PDF', 'QUIZ', 'ASSIGNMENT']),
    body('order').optional().isInt(),
    body('isPreview').optional().isBoolean(),
    body('isLocked').optional().isBoolean(),
    body('unlockRequirement').optional(),
  ],
  updateLesson
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteLesson
);

export default router;



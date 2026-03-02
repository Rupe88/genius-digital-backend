import express from 'express';
import { getByCourse, create, remove } from '../controllers/courseCommentController.js';
import { authenticate } from '../middleware/auth.js';
import { param, body, query } from 'express-validator';
import { validationResult } from 'express-validator';

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Public: list comments for a course
router.get(
  '/course/:courseId',
  [param('courseId').isUUID().withMessage('Invalid course ID')],
  handleValidation,
  getByCourse
);

// Authenticated: create comment (enrolled only checked in controller)
router.post(
  '/course/:courseId',
  authenticate,
  [
    param('courseId').isUUID().withMessage('Invalid course ID'),
    body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 2000 }).withMessage('Max 2000 characters'),
  ],
  handleValidation,
  create
);

// Authenticated: delete own comment (or admin)
router.delete(
  '/:id',
  authenticate,
  [param('id').isUUID().withMessage('Invalid comment ID')],
  handleValidation,
  remove
);

export default router;

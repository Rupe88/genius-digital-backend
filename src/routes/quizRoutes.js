import express from 'express';
import {
  getQuizByLesson,
  getQuizByLessonAdmin,
  submitQuiz,
  getUserAttempts,
  getAdminQuizAttempts,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} from '../controllers/quizController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param } from 'express-validator';

const router = express.Router();

// User routes
router.get(
  '/lesson/:lessonId',
  authenticate,
  [param('lessonId').isUUID().withMessage('Invalid lesson ID')],
  getQuizByLesson
);

router.post(
  '/:quizId/submit',
  authenticate,
  [
    param('quizId').isUUID().withMessage('Invalid quiz ID'),
    body('answers')
      .isObject()
      .withMessage('Answers must be an object'),
  ],
  submitQuiz
);

router.get(
  '/:quizId/attempts',
  authenticate,
  [param('quizId').isUUID().withMessage('Invalid quiz ID')],
  getUserAttempts
);

// Admin – get full quiz by lesson (includes correctAnswer for editing)
router.get(
  '/admin/lesson/:lessonId',
  authenticate,
  requireAdmin,
  [param('lessonId').isUUID().withMessage('Invalid lesson ID')],
  getQuizByLessonAdmin
);

// Admin – list all quiz attempts with filters
router.get(
  '/admin/attempts',
  authenticate,
  requireAdmin,
  getAdminQuizAttempts
);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('lessonId').isUUID().withMessage('Invalid lesson ID'),
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('passingScore').optional().isInt({ min: 0, max: 100 }),
    body('timeLimit').optional().isInt({ min: 1 }),
    body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
    body('questions.*.question').notEmpty().withMessage('Question text is required'),
    body('questions.*.correctAnswer').notEmpty().withMessage('Correct answer is required'),
    body('questions.*.points').optional().isInt({ min: 1 }),
  ],
  createQuiz
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid quiz ID'),
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('timeLimit').optional().isInt({ min: 1 }),
    body('passingScore').optional().isInt({ min: 0, max: 100 }),
  ],
  updateQuiz
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID().withMessage('Invalid quiz ID')],
  deleteQuiz
);

export default router;

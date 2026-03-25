import express from 'express';
import {
  getQuizByLesson,
  getQuizByLessonAdmin,
  submitQuiz,
  getUserAttempts,
  getMyConsultationAttempts,
  getMyQuizAttempts,
  getMyQuizAttemptDetails,
  getAdminQuizAttempts,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  updateQuizAttemptFeedback,
} from '../controllers/quizController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param } from 'express-validator';

const router = express.Router();

// --- Static path segments FIRST (before /:quizId/… or /:id or Express will treat "admin" / "my" as IDs)

router.get(
  '/lesson/:lessonId',
  authenticate,
  [param('lessonId').isUUID().withMessage('Invalid lesson ID')],
  getQuizByLesson
);

// User – consultation quiz attempts (must be before /:quizId/attempts)
router.get('/my/consultation-attempts', authenticate, getMyConsultationAttempts);

// User – single quiz attempt details (must be before /:quizId/attempts)
router.get('/my/attempts/:attemptId', authenticate, getMyQuizAttemptDetails);

// User – quiz attempts history (must be before /:quizId/attempts)
router.get('/my/attempts', authenticate, getMyQuizAttempts);

// Admin – must be before GET /:quizId/attempts (otherwise "admin" is captured as quizId)
router.get(
  '/admin/lesson/:lessonId',
  authenticate,
  requireAdmin,
  [param('lessonId').isUUID().withMessage('Invalid lesson ID')],
  getQuizByLessonAdmin
);

router.get('/admin/attempts', authenticate, requireAdmin, getAdminQuizAttempts);

router.patch(
  '/admin/attempts/:id/feedback',
  authenticate,
  requireAdmin,
  [param('id').isUUID().withMessage('Invalid attempt ID')],
  updateQuizAttemptFeedback
);

// Admin – create quiz (POST /quizzes)
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

// User – submit (before generic /:id routes)
router.post(
  '/:quizId/submit',
  authenticate,
  [
    param('quizId').isUUID().withMessage('Invalid quiz ID'),
    body('answers').isObject().withMessage('Answers must be an object'),
  ],
  submitQuiz
);

router.get(
  '/:quizId/attempts',
  authenticate,
  [param('quizId').isUUID().withMessage('Invalid quiz ID')],
  getUserAttempts
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

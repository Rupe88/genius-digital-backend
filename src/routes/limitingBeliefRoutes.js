import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validate } from '../utils/validators.js';
import {
  getCatalog,
  postAttempt,
  getAdminCatalog,
  createSection,
  updateSection,
  deleteSection,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createScoreBand,
  updateScoreBand,
  deleteScoreBand,
  listAttempts,
} from '../controllers/limitingBeliefController.js';

const router = express.Router();

router.get('/catalog', authenticate, getCatalog);

router.post(
  '/attempts',
  authenticate,
  [body('answers').isObject().withMessage('answers must be an object')],
  validate,
  postAttempt
);

router.get('/admin/catalog', authenticate, requireAdmin, getAdminCatalog);

router.get(
  '/admin/attempts',
  authenticate,
  requireAdmin,
  [query('limit').optional().isInt({ min: 1, max: 100 }), query('offset').optional().isInt({ min: 0 })],
  validate,
  listAttempts
);

router.post(
  '/admin/sections',
  authenticate,
  requireAdmin,
  [
    body('title').notEmpty().trim().isLength({ min: 1, max: 255 }),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  createSection
);

router.put(
  '/admin/sections/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  updateSection
);

router.delete(
  '/admin/sections/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  validate,
  deleteSection
);

router.post(
  '/admin/questions',
  authenticate,
  requireAdmin,
  [
    body('sectionId').isUUID(),
    body('text').notEmpty().isString(),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  createQuestion
);

router.put(
  '/admin/questions/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID(),
    body('text').optional().isString(),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
    body('sectionId').optional().isUUID(),
  ],
  validate,
  updateQuestion
);

router.delete(
  '/admin/questions/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  validate,
  deleteQuestion
);

router.post(
  '/admin/score-bands',
  authenticate,
  requireAdmin,
  [
    body('minScore').isInt(),
    body('maxScore').isInt(),
    body('label').notEmpty().trim().isLength({ min: 1, max: 500 }),
    body('description').optional().isString(),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  createScoreBand
);

router.put(
  '/admin/score-bands/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID(),
    body('minScore').optional().isInt(),
    body('maxScore').optional().isInt(),
    body('label').optional().trim().isLength({ min: 1, max: 500 }),
    body('description').optional(),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  updateScoreBand
);

router.delete(
  '/admin/score-bands/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  validate,
  deleteScoreBand
);

export default router;

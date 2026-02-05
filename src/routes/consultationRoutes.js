import express from 'express';
import {
  getConsultationCategories,
  submitConsultation,
  getAllConsultations,
  getConsultationById,
  updateConsultation,
  deleteConsultation,
} from '../controllers/consultationController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { consultationValidation } from '../utils/validators.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Public: get consultation categories (must be before /:id)
router.get('/categories', getConsultationCategories);

// Public: submit consultation form
router.post('/', consultationValidation, submitConsultation);

// Admin routes
router.get(
  '/',
  authenticate,
  requireAdmin,
  [
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getAllConsultations
);

router.get(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  getConsultationById
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID(),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
    body('notes').optional().isString(),
  ],
  updateConsultation
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteConsultation
);

export default router;



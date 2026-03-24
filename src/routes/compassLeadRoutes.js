import express from 'express';
import { body, query } from 'express-validator';
import { createCompassLead, getCompassLeads } from '../controllers/leadController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validate } from '../utils/validators.js';

const router = express.Router();

// Public submit endpoint (for compass app integration)
router.post(
  '/',
  validate([
    body('fullName').trim().isLength({ min: 1, max: 255 }).withMessage('fullName is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').optional().trim().isLength({ max: 50 }),
    body('message').optional().isString(),
    body('metadata').optional().isObject(),
  ]),
  createCompassLead
);

// Admin list endpoint
router.get(
  '/',
  authenticate,
  requireAdmin,
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim(),
    query('q').optional().isString().trim(),
  ]),
  getCompassLeads
);

export default router;

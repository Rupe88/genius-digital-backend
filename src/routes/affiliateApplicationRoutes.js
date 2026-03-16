import express from 'express';
import {
  submitApplication,
  getAllApplications,
  updateApplicationStatus,
} from '../controllers/affiliateApplicationController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validators.js';

const router = express.Router();

// User: submit affiliate application form
router.post(
  '/',
  authenticate,
  validate([
    body('fullName').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().trim().isLength({ min: 1, max: 50 }).withMessage('Phone is required'),
    body('dateOfBirth').optional().trim().isLength({ max: 20 }),
    body('country').optional().trim().isLength({ max: 100 }),
    body('city').optional().trim().isLength({ max: 100 }),
    body('currentOccupation').optional().trim().isLength({ max: 255 }),
    body('hasAffiliateExperience').optional().isBoolean(),
    body('experienceDetails').optional().trim(),
    body('occultKnowledge').optional().trim().isLength({ max: 100 }),
    body('occultOther').optional().trim(),
    body('whyJoin').optional().trim(),
  ]),
  submitApplication
);

// Admin: list all applications
router.get(
  '/',
  authenticate,
  requireAdmin,
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim(),
    query('q').optional().isString().trim(),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
  ]),
  getAllApplications
);

// Admin: approve/reject an application (and activate affiliate)
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  validate([
    param('id').isUUID().withMessage('Invalid application ID'),
    body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Invalid status'),
  ]),
  updateApplicationStatus
);

export default router;

import express from 'express';
import {
  getUserCertificates,
  issueCertificate,
  verifyCertificate,
  checkEligibility,
  getAllCertificatesAdmin,
  issueCertificateForUser,
} from '../controllers/certificateController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { param, body } from 'express-validator';

const router = express.Router();

// Public route
router.get(
  '/verify/:certificateId',
  [param('certificateId').notEmpty().withMessage('Certificate ID is required')],
  verifyCertificate
);

// Admin routes (must be before /course/:courseId to avoid "admin" as courseId)
router.get(
  '/admin',
  authenticate,
  requireAdmin,
  getAllCertificatesAdmin
);

router.post(
  '/admin/issue',
  authenticate,
  requireAdmin,
  [
    body('userId').isUUID().withMessage('Valid userId is required'),
    body('courseId').isUUID().withMessage('Valid courseId is required'),
  ],
  issueCertificateForUser
);

// Authenticated routes
router.get(
  '/',
  authenticate,
  getUserCertificates
);

router.get(
  '/course/:courseId/eligibility',
  authenticate,
  [param('courseId').isUUID().withMessage('Invalid course ID')],
  checkEligibility
);

router.post(
  '/course/:courseId/issue',
  authenticate,
  [param('courseId').isUUID().withMessage('Invalid course ID')],
  issueCertificate
);

export default router;

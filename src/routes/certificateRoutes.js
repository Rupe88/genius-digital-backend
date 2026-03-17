import express from 'express';
import {
  getUserCertificates,
  issueCertificate,
  verifyCertificate,
  checkEligibility,
  getAllCertificatesAdmin,
  issueCertificateForUser,
  uploadCertificateForUser,
  proxyCertificateTemplate,
} from '../controllers/certificateController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { param, body } from 'express-validator';
import { singleUpload, processDocumentUpload } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

// Public route
router.get(
  '/verify/:certificateId',
  [param('certificateId').notEmpty().withMessage('Certificate ID is required')],
  verifyCertificate
);

// Proxy template image for client-side PDF generation (public; fetches remote image and returns bytes)
router.get('/template-proxy', proxyCertificateTemplate);

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

// Admin: upload a signed certificate file for a user & course
router.post(
  '/admin/upload',
  authenticate,
  requireAdmin,
  singleUpload('file'),
  processDocumentUpload,
  [
    body('userId').isUUID().withMessage('Valid userId is required'),
    body('courseId').isUUID().withMessage('Valid courseId is required'),
  ],
  uploadCertificateForUser
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

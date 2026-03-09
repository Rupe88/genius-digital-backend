import express from 'express';
import {
  getGallery,
  getGalleryById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from '../controllers/galleryController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import {
  fieldsUpload,
  processGalleryFiles,
} from '../middleware/cloudinaryUpload.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Public routes
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getGallery
);

router.get(
  '/:id',
  [param('id').isUUID()],
  getGalleryById
);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  // Allow up to 50 images or 1 video per upload
  fieldsUpload([
    { name: 'files', maxCount: 50 },
    { name: 'video', maxCount: 1 },
  ]),
  processGalleryFiles,
  [
    body('title').optional().isString().isLength({ max: 255 }),
    body('mediaType').optional().isIn(['IMAGE', 'VIDEO']),
    body('videoUrl').optional().isString().isLength({ max: 500 }),
  ],
  createGalleryItem
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  fieldsUpload([
    { name: 'file', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  processGalleryFiles,
  [
    param('id').isUUID(),
    body('title').optional().isString().isLength({ max: 255 }),
    body('mediaType').optional().isIn(['IMAGE', 'VIDEO']),
    body('videoUrl').optional().isString().isLength({ max: 500 }),
  ],
  updateGalleryItem
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteGalleryItem
);

export default router;



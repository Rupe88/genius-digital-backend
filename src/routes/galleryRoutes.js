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
  singleUpload,
  multipleUpload,
  processImageUpload,
  processMultipleImagesUpload,
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
  // Allow up to 50 images per upload
  (req, _res, next) => {
    // Ensure gallery uploads go to gallery folder
    req.body.folder = 'lms/gallery';
    next();
  },
  multipleUpload('files', 50),
  processMultipleImagesUpload,
  [
    body('title').optional().isString().isLength({ max: 255 }),
  ],
  createGalleryItem
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  singleUpload('file'),
  processImageUpload,
  [
    param('id').isUUID(),
    body('title').optional().isString().isLength({ max: 255 }),
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



import express from 'express';
import { param } from 'express-validator';
import {
  getSlides,
  getAllSlidesAdmin,
  processCarouselUpload,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
} from '../controllers/carouselController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { fieldsUpload } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

const carouselFields = [
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
];

// Public: get slides for home page
router.get('/', getSlides);

// Admin: list all slides
router.get('/admin', authenticate, requireAdmin, getAllSlidesAdmin);

// Admin: create slide (image required, video optional)
router.post(
  '/admin',
  authenticate,
  requireAdmin,
  fieldsUpload(carouselFields),
  processCarouselUpload,
  createSlide
);

// Admin: reorder slides (must be before /:id)
router.post(
  '/admin/reorder',
  authenticate,
  requireAdmin,
  reorderSlides
);

// Admin: update slide
router.put(
  '/admin/:id',
  authenticate,
  requireAdmin,
  fieldsUpload(carouselFields),
  processCarouselUpload,
  [param('id').isUUID()],
  updateSlide
);

// Admin: delete slide
router.delete(
  '/admin/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteSlide
);

export default router;

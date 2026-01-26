import express from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { singleUpload, processImageUpload } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

// Admin only - upload image to Cloudinary (no database record)
router.post(
  '/image',
  authenticate,
  requireAdmin,
  singleUpload('file'),
  processImageUpload,
  uploadImage
);

export default router;

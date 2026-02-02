import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductReviews,
  createProductReview,
  updateProductReview,
  deleteProductReview,
} from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { optionalMultipleUpload, processMultipleImagesUpload } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

// Public
router.get('/', getAllProducts);

// Reviews (must be before /:id so /:id/reviews matches)
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', authenticate, createProductReview);
router.put('/:id/reviews/:reviewId', authenticate, updateProductReview);
router.delete('/:id/reviews/:reviewId', authenticate, deleteProductReview);

// Single product (by id or slug)
router.get('/:id', getProductById);

// Admin only (JSON or multipart with images -> Cloudinary)
router.post('/', authenticate, requireAdmin, optionalMultipleUpload('images', 5, processMultipleImagesUpload), createProduct);
router.put('/:id', authenticate, requireAdmin, optionalMultipleUpload('images', 5, processMultipleImagesUpload), updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;

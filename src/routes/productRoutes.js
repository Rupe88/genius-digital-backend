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
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validators.js';

const router = express.Router();

// Public routes
router.get(
  '/',
  [
    query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']),
    query('featured').optional().isBoolean(),
    query('categoryId').optional().isUUID(),
    query('search').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('inStock').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['newest', 'oldest', 'price-low', 'price-high', 'name']),
  ],
  getAllProducts
);

router.get(
  '/:id',
  [param('id').notEmpty()],
  getProductById
);

router.get(
  '/:id/reviews',
  [
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getProductReviews
);

// Authenticated routes
router.post(
  '/:id/reviews',
  authenticate,
  [
    param('id').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString().trim(),
  ],
  validate,
  createProductReview
);

router.put(
  '/:id/reviews/:reviewId',
  authenticate,
  [
    param('id').isUUID(),
    param('reviewId').isUUID(),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('comment').optional().isString().trim(),
  ],
  validate,
  updateProductReview
);

router.delete(
  '/:id/reviews/:reviewId',
  authenticate,
  [
    param('id').isUUID(),
    param('reviewId').isUUID(),
  ],
  deleteProductReview
);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').notEmpty().trim().withMessage('Product name is required'),
    body('slug').notEmpty().trim().withMessage('Product slug is required'),
    body('description').optional().isString(),
    body('shortDescription').optional().isString().isLength({ max: 500 }),
    body('images').optional(),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('comparePrice').optional().isFloat({ min: 0 }),
    body('sku').optional().isString().trim(),
    body('stock').optional().isInt({ min: 0 }),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']),
    body('featured').optional().custom((value) => {
      if (value === undefined || value === null) return true;
      return typeof value === 'boolean' || value === 'true' || value === 'false';
    }).withMessage('Featured must be a boolean'),
    body('categoryId').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }).withMessage('Category ID must be a valid UUID'),
    // Vastu specific fields
    body('productType').optional().isIn(['VASTU_ITEM', 'CONSULTATION_PACKAGE', 'DIGITAL_PRODUCT', 'PHYSICAL_PRODUCT']),
    body('vastuPurpose').optional().isString().trim(),
    body('energyType').optional().isIn(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'BALANCED']),
    body('material').optional().isString().trim(),
    body('dimensions').optional().isObject(),
    body('dimensions.length').optional().isFloat({ min: 0 }),
    body('dimensions.width').optional().isFloat({ min: 0 }),
    body('dimensions.height').optional().isFloat({ min: 0 }),
  ],
  validate,
  createProduct
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID(),
    body('name').optional().notEmpty().trim(),
    body('slug').optional().notEmpty().trim(),
    body('description').optional().isString(),
    body('shortDescription').optional().isString().isLength({ max: 500 }),
    body('images').optional(),
    body('price').optional().isFloat({ min: 0 }),
    body('comparePrice').optional().isFloat({ min: 0 }),
    body('sku').optional().isString().trim(),
    body('stock').optional().isInt({ min: 0 }),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']),
    body('featured').optional().custom((value) => {
      if (value === undefined || value === null) return true;
      return typeof value === 'boolean' || value === 'true' || value === 'false';
    }).withMessage('Featured must be a boolean'),
    body('categoryId').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }).withMessage('Category ID must be a valid UUID'),
    // Vastu specific fields
    body('productType').optional().isIn(['VASTU_ITEM', 'CONSULTATION_PACKAGE', 'DIGITAL_PRODUCT', 'PHYSICAL_PRODUCT']),
    body('vastuPurpose').optional().isString().trim(),
    body('energyType').optional().isIn(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'BALANCED']),
    body('material').optional().isString().trim(),
    body('dimensions').optional().isObject(),
    body('dimensions.length').optional().isFloat({ min: 0 }),
    body('dimensions.width').optional().isFloat({ min: 0 }),
    body('dimensions.height').optional().isFloat({ min: 0 }),
  ],
  validate,
  updateProduct
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteProduct
);

export default router;


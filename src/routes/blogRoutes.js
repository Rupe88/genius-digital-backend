import express from 'express';
import {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../controllers/blogController.js';
import {
  getBlogComments,
  createBlogComment,
  updateBlogComment,
  deleteBlogComment,
  moderateComment,
} from '../controllers/blogCommentController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validators.js';
import { singleUpload, processImageUpload } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

// Public routes
router.get(
  '/',
  [
    query('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    query('featured').optional().isBoolean(),
    query('categoryId').optional().isUUID(),
    query('authorId').optional().isUUID(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getAllBlogs
);

router.get(
  '/:id',
  [param('id').notEmpty()],
  getBlogById
);

// Blog comments routes
router.get(
  '/:id/comments',
  [
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('approved').optional().isBoolean(),
  ],
  getBlogComments
);

router.post(
  '/:id/comments',
  authenticate,
  [
    param('id').isUUID(),
    body('content').notEmpty().trim().withMessage('Comment content is required'),
    body('name').optional().isString().trim(),
    body('email').optional().isEmail(),
    body('parentId').optional().isUUID(),
  ],
  validate,
  createBlogComment
);

router.put(
  '/:id/comments/:commentId',
  authenticate,
  [
    param('id').isUUID(),
    param('commentId').isUUID(),
    body('content').notEmpty().trim().withMessage('Comment content is required'),
  ],
  validate,
  updateBlogComment
);

router.delete(
  '/:id/comments/:commentId',
  authenticate,
  [
    param('id').isUUID(),
    param('commentId').isUUID(),
  ],
  deleteBlogComment
);

router.post(
  '/:id/comments/:commentId/moderate',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID(),
    param('commentId').isUUID(),
    body('isApproved').isBoolean(),
  ],
  validate,
  moderateComment
);

// Blog CRUD routes - Restricted to Admin/Instructor usually, here implementing Admin restriction for safety
router.post(
  '/',
  authenticate,
  requireAdmin,
  singleUpload('featuredImage'),
  processImageUpload,
  validate([
    body('title').notEmpty().trim().withMessage('Blog title is required'),
    body('slug').notEmpty().trim().withMessage('Blog slug is required'),
    body('content').notEmpty().withMessage('Blog content is required'),
    body('excerpt').optional().isString().isLength({ max: 500 }),
    body('categoryId').optional().isUUID(),
    body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    body('featured').optional().isBoolean(),
    body('tags').optional().isString(),
    body('seoTitle').optional().isString().isLength({ max: 255 }),
    body('seoDescription').optional().isString().isLength({ max: 500 }),
  ]),
  createBlog
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  singleUpload('featuredImage'),
  processImageUpload,
  validate([
    param('id').isUUID(),
    body('title').optional().notEmpty().trim(),
    body('slug').optional().notEmpty().trim(),
    body('content').optional().notEmpty(),
    body('excerpt').optional().isString().isLength({ max: 500 }),
    body('categoryId').optional().isUUID(),
    body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    body('featured').optional().isBoolean(),
    body('tags').optional().isString(),
    body('seoTitle').optional().isString().isLength({ max: 255 }),
    body('seoDescription').optional().isString().isLength({ max: 500 }),
  ]),
  updateBlog
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteBlog
);

export default router;

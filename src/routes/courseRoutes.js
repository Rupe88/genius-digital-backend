import express from 'express';
import {
  getAllCourses,
  filterCourses,
  getFeaturedCourses,
  getOngoingCourses,
  getCourseById,
  createCourse,
  updateCourse,
  updateCourseStatus,
  updateCourseFeatured,
  deleteCourse,
} from '../controllers/courseController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { fieldsUpload, processCourseFiles } from '../middleware/cloudinaryUpload.js';
import { courseValidation, courseFilterValidation } from '../utils/validators.js';
import { param, query, body } from 'express-validator';

const router = express.Router();

// Public routes
router.get('/', getAllCourses);
router.get('/filter', courseFilterValidation, filterCourses);
router.get('/featured', getFeaturedCourses);
router.get('/ongoing', getOngoingCourses);

router.get(
  '/:id',
  optionalAuthenticate,
  [param('id').notEmpty()],
  getCourseById
);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  fieldsUpload([{ name: 'thumbnail', maxCount: 1 }, { name: 'video', maxCount: 5 }]),
  processCourseFiles,
  courseValidation,
  createCourse
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  fieldsUpload([{ name: 'thumbnail', maxCount: 1 }, { name: 'video', maxCount: 5 }]),
  processCourseFiles,
  [param('id').isUUID(), ...courseValidation],
  updateCourse
);

router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  [param('id').isUUID(), body('status').isIn(['DRAFT', 'PUBLISHED', 'ONGOING', 'ARCHIVED', 'UPCOMING_EVENTS']).withMessage('Invalid status')],
  updateCourseStatus
);

router.patch(
  '/:id/featured',
  authenticate,
  requireAdmin,
  [param('id').isUUID(), body('featured').isBoolean().withMessage('featured must be a boolean')],
  updateCourseFeatured
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteCourse
);

export default router;



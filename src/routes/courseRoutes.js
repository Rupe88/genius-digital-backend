import express from 'express';
import {
  getAllCourses,
  filterCourses,
  getOngoingCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../controllers/courseController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { singleUpload, processImageUpload } from '../middleware/cloudinaryUpload.js';
import { courseValidation, courseFilterValidation } from '../utils/validators.js';
import { param, query } from 'express-validator';

const router = express.Router();

// Public routes
router.get('/', getAllCourses);
router.get('/filter', courseFilterValidation, filterCourses);
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
  singleUpload('thumbnail'),
  processImageUpload,
  courseValidation,
  createCourse
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  singleUpload('thumbnail'),
  processImageUpload,
  [param('id').isUUID(), ...courseValidation],
  updateCourse
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isUUID()],
  deleteCourse
);

export default router;



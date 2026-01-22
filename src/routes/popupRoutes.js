import express from 'express';
import { body } from 'express-validator';
import * as popupController from '../controllers/popupController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { singleUpload, processImageUpload } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

// Public routes
router.get('/active', popupController.getActivePopup);

// Admin routes
router.get('/', authenticate, requireAdmin, popupController.getAllPopups);

router.post(
    '/',
    authenticate,
    requireAdmin,
    singleUpload('image'),
    processImageUpload,
    [
        body('title').notEmpty().withMessage('Title is required'),
        body('linkUrl').optional().isURL().withMessage('Invalid link URL'),
    ],
    popupController.createPopup
);

router.put(
    '/:id',
    authenticate,
    requireAdmin,
    singleUpload('image'),
    processImageUpload,
    [
        body('title').optional().notEmpty().withMessage('Title cannot be empty'),
        body('linkUrl').optional().isURL().withMessage('Invalid link URL'),
    ],
    popupController.updatePopup
);

router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    popupController.deletePopup
);

export default router;

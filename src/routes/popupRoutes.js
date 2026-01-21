import express from 'express';
import { body } from 'express-validator';
import * as popupController from '../controllers/popupController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { singleUpload, processImageUpload } from '../middleware/cloudinaryUpload.js';

const router = express.Router();

// Public routes
router.get('/active', popupController.getActivePopup);

// Admin routes
router.get('/', protect, authorize('ADMIN'), popupController.getAllPopups);

router.post(
    '/',
    protect,
    authorize('ADMIN'),
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
    protect,
    authorize('ADMIN'),
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
    protect,
    authorize('ADMIN'),
    popupController.deletePopup
);

export default router;

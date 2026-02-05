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
        body('linkUrl')
            .optional({ values: 'falsy' })
            .custom((value) => {
                if (!value || value === '') return true; // Allow empty string
                // Accept URLs with or without protocol, including localhost
                // Examples: http://localhost, https://localhost:3000, localhost, /path, etc.
                try {
                    // Try to parse as URL (works with protocol)
                    if (value.startsWith('http://') || value.startsWith('https://')) {
                        new URL(value);
                        return true;
                    }
                    // Accept localhost without protocol
                    if (value.startsWith('localhost') || value.startsWith('127.0.0.1')) {
                        return true;
                    }
                    // Accept relative paths
                    if (value.startsWith('/')) {
                        return true;
                    }
                    // Try parsing with http:// prefix to validate domain format
                    try {
                        new URL(`http://${value}`);
                        return true;
                    } catch {
                        return false;
                    }
                } catch {
                    return false;
                }
            })
            .withMessage('Invalid link URL'),
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
        body('linkUrl')
            .optional({ values: 'falsy' })
            .custom((value) => {
                if (!value || value === '') return true; // Allow empty string
                // Accept URLs with or without protocol, including localhost
                // Examples: http://localhost, https://localhost:3000, localhost, /path, etc.
                try {
                    // Try to parse as URL (works with protocol)
                    if (value.startsWith('http://') || value.startsWith('https://')) {
                        new URL(value);
                        return true;
                    }
                    // Accept localhost without protocol
                    if (value.startsWith('localhost') || value.startsWith('127.0.0.1')) {
                        return true;
                    }
                    // Accept relative paths
                    if (value.startsWith('/')) {
                        return true;
                    }
                    // Try parsing with http:// prefix to validate domain format
                    try {
                        new URL(`http://${value}`);
                        return true;
                    } catch {
                        return false;
                    }
                } catch {
                    return false;
                }
            })
            .withMessage('Invalid link URL'),
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

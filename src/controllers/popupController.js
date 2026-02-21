import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


/**
 * Get active popup for public display.
 * When DB is unreachable, returns success with no popup so the app keeps working.
 */
export const getActivePopup = async (req, res, next) => {
    try {
        const popup = await prisma.popup.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: popup,
        });
    } catch (error) {
        // DB unreachable (e.g. Supabase paused, network issue) – don't break the app
        if (error.code === 'P1001' || (error.message && error.message.includes("Can't reach database server"))) {
            console.warn('[popups] Database unreachable, returning no popup:', error.message?.split('\n')[0]);
            return res.json({ success: true, data: null });
        }
        next(error);
    }
};

/**
 * Get all popups (Admin)
 */
export const getAllPopups = async (req, res, next) => {
    try {
        const popups = await prisma.popup.findMany({
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: popups,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new popup (Admin)
 */
export const createPopup = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }

        const { title, linkUrl, isActive } = req.body;
        let imageUrl = req.body.imageUrl;

        if (req.cloudinary && req.cloudinary.url) {
            imageUrl = req.cloudinary.url;
        }

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'Image is required (either file upload or imageUrl)',
            });
        }

        const popup = await prisma.popup.create({
            data: {
                title,
                imageUrl,
                linkUrl: linkUrl && linkUrl.trim() ? linkUrl.trim() : null,
                isActive: isActive === true || isActive === 'true',
            },
        });

        res.status(201).json({
            success: true,
            message: 'Popup created successfully',
            data: popup,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update a popup (Admin)
 */
export const updatePopup = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, linkUrl, isActive } = req.body;
        let { imageUrl } = req.body;

        if (req.cloudinary && req.cloudinary.url) {
            imageUrl = req.cloudinary.url;
        }

        const popup = await prisma.popup.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(imageUrl && { imageUrl }),
                ...(linkUrl !== undefined && { linkUrl }),
                ...(isActive !== undefined && { isActive: Boolean(isActive === 'true' || isActive === true) }),
            },
        });

        res.json({
            success: true,
            message: 'Popup updated successfully',
            data: popup,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a popup (Admin)
 */
export const deletePopup = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.popup.delete({
            where: { id },
        });

        res.json({
            success: true,
            message: 'Popup deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

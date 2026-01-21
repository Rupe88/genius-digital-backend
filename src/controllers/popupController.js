import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Get active popup for public display
 */
export const getActivePopup = async (req, res, next) => {
    try {
        const popup = await prisma.popup.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }, // Get the most recently created active one
        });

        res.json({
            success: true,
            data: popup,
        });
    } catch (error) {
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

        const { title, imageUrl, linkUrl, isActive } = req.body;

        // If setting to active, optionally deactivate others if you only want ONE active at a time
        // For now, we'll allow multiple active but frontend picks first. Or we can enforce single active.
        // Let's enforce single active for simplicity in UX? 
        // Usually, "Active" just means "Eligible". The frontend logic (findFirst) handles the "only one" rule. 
        // But let's keep it flexible.

        const popup = await prisma.popup.create({
            data: {
                title,
                imageUrl,
                linkUrl,
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
        const { title, imageUrl, linkUrl, isActive } = req.body;

        const popup = await prisma.popup.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(imageUrl && { imageUrl }),
                ...(linkUrl !== undefined && { linkUrl }), // allow clearing link
                ...(isActive !== undefined && { isActive: Boolean(isActive) }),
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

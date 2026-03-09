import { prisma } from '../config/database.js';

import { validationResult } from 'express-validator';


/**
 * Get all published gallery items (Public)
 */
export const getGallery = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      prisma.gallery.findMany({
        skip,
        take: parseInt(limit),
        orderBy: [
          { createdAt: 'desc' },
        ],
      }),
      prisma.gallery.count(),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get gallery item by ID (Public)
 */
export const getGalleryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.gallery.findUnique({
      where: { id },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found',
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create gallery item (Admin only)
 */
export const createGalleryItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { title, mediaType, videoUrl: bodyVideoUrl } = req.body;
    const requestedType = mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE';

    const imageUrls = req.cloudinary?.imageUrls;
    const uploadedVideoUrl = req.cloudinary?.videoUrl;
    const trimmedBodyVideoUrl = typeof bodyVideoUrl === 'string' ? bodyVideoUrl.trim() : '';

    if (requestedType === 'IMAGE' && (!imageUrls || imageUrls.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded',
      });
    }

    if (requestedType === 'VIDEO' && !uploadedVideoUrl && !trimmedBodyVideoUrl) {
      return res.status(400).json({
        success: false,
        message: 'No video provided. Please upload a video file or provide a YouTube/Google Drive link.',
      });
    }

    let createdItems;

    if (requestedType === 'IMAGE') {
      createdItems = await Promise.all(
        imageUrls.map((url) =>
          prisma.gallery.create({
            data: {
              title: title && title.trim() ? title.trim() : null,
              imageUrl: url,
              mediaType: 'IMAGE',
            },
          })
        )
      );
    } else {
      const finalVideoUrl = uploadedVideoUrl || trimmedBodyVideoUrl;
      const item = await prisma.gallery.create({
        data: {
          title: title && title.trim() ? title.trim() : null,
          videoUrl: finalVideoUrl,
          mediaType: 'VIDEO',
        },
      });
      createdItems = [item];
    }

    res.status(201).json({
      success: true,
      data: createdItems,
      message: 'Gallery items created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update gallery item (Admin only)
 */
export const updateGalleryItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { title, mediaType, videoUrl: bodyVideoUrl } = req.body;

    const updateData = {};
    if (title !== undefined) {
      // Only include title if it's a non-empty string, otherwise omit it (keeps existing) or set to null
      if (title && title.trim()) {
        updateData.title = title.trim();
      } else {
        updateData.title = null;
      }
    }
    const imageUrls = req.cloudinary?.imageUrls;
    const uploadedVideoUrl = req.cloudinary?.videoUrl;
    const trimmedBodyVideoUrl = typeof bodyVideoUrl === 'string' ? bodyVideoUrl.trim() : '';

    // Media updates: image or video
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      updateData.imageUrl = imageUrls[0];
      updateData.videoUrl = null;
      updateData.mediaType = 'IMAGE';
    } else if (uploadedVideoUrl || trimmedBodyVideoUrl) {
      const finalVideoUrl = uploadedVideoUrl || trimmedBodyVideoUrl;
      updateData.videoUrl = finalVideoUrl;
      updateData.imageUrl = null;
      updateData.mediaType = 'VIDEO';
    } else if (mediaType === 'IMAGE' || mediaType === 'VIDEO') {
      // If mediaType is explicitly provided without new media, align type only
      updateData.mediaType = mediaType;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nothing to update',
      });
    }

    const galleryItem = await prisma.gallery.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: galleryItem,
      message: 'Gallery item updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found',
      });
    }
    next(error);
  }
};

/**
 * Delete gallery item (Admin only)
 */
export const deleteGalleryItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.gallery.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Gallery item deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found',
      });
    }
    next(error);
  }
};



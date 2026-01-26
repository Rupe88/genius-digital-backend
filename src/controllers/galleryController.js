import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Get all published gallery items (Public)
 */
export const getGallery = async (req, res, next) => {
  try {
    const { type, category, featured, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isPublished: true,
    };
    if (type) where.type = type;
    if (category) where.category = category;
    if (featured === 'true') where.featured = true;

    const [items, total] = await Promise.all([
      prisma.gallery.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [
          { featured: 'desc' },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.gallery.count({ where }),
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

    if (!item || !item.isPublished) {
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

    const {
      title,
      description,
      imageUrl,
      videoUrl,
      type,
      category,
      isPublished,
      featured,
      order,
    } = req.body;

    // Determine type from uploaded file
    let finalType = type || 'IMAGE';
    let finalImageUrl = imageUrl;
    let finalVideoUrl = videoUrl;

    if (req.cloudinary) {
      if (req.cloudinary.format === 'video' || req.file?.mimetype?.startsWith('video/')) {
        finalType = 'VIDEO';
        finalVideoUrl = req.cloudinary.url;
      } else {
        finalType = 'IMAGE';
        finalImageUrl = req.cloudinary.url;
      }
    }

    // Convert string booleans from FormData to actual booleans
    const isPublishedBool = typeof isPublished === 'string' 
      ? isPublished === 'true' 
      : Boolean(isPublished);
    const featuredBool = typeof featured === 'string'
      ? featured === 'true'
      : Boolean(featured);

    const galleryItem = await prisma.gallery.create({
      data: {
        title,
        description,
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        type: finalType,
        category,
        isPublished: isPublishedBool,
        featured: featuredBool,
        order: order ? parseInt(order) : 0,
      },
    });

    res.status(201).json({
      success: true,
      data: galleryItem,
      message: 'Gallery item created successfully',
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
    const {
      title,
      description,
      imageUrl,
      videoUrl,
      type,
      category,
      isPublished,
      featured,
      order,
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (req.cloudinary) {
      if (req.cloudinary.format === 'video' || req.file?.mimetype?.startsWith('video/')) {
        updateData.type = 'VIDEO';
        updateData.videoUrl = req.cloudinary.url;
      } else {
        updateData.type = 'IMAGE';
        updateData.imageUrl = req.cloudinary.url;
      }
    } else {
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
      if (type) updateData.type = type;
    }
    if (category !== undefined) updateData.category = category;
    if (isPublished !== undefined) {
      updateData.isPublished = typeof isPublished === 'string' 
        ? isPublished === 'true' 
        : Boolean(isPublished);
    }
    if (featured !== undefined) {
      updateData.featured = typeof featured === 'string'
        ? featured === 'true'
        : Boolean(featured);
    }
    if (order !== undefined) {
      updateData.order = typeof order === 'string' ? parseInt(order) : order;
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



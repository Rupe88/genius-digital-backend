import { prisma } from '../config/database.js';
import { uploadImage, uploadVideo } from '../services/storageService.js';

/**
 * Public: Get all carousel slides for home page (ordered)
 */
export const getSlides = async (req, res, next) => {
  try {
    const slides = await prisma.heroCarouselSlide.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: slides });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all slides
 */
export const getAllSlidesAdmin = async (req, res, next) => {
  try {
    const slides = await prisma.heroCarouselSlide.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: slides });
  } catch (error) {
    next(error);
  }
};

/**
 * Process carousel uploads: image (required on create) + optional video
 * Expects req.files from multer.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }])
 */
export const processCarouselUpload = async (req, res, next) => {
  try {
    req.carouselUploads = {};
    if (req.files?.image?.[0]) {
      const file = req.files.image[0];
      const result = await uploadImage(file.buffer, {
        folder: 'lms/carousel',
        mimeType: file.mimetype,
      });
      req.carouselUploads.imageUrl = result.secure_url;
    }
    if (req.files?.video?.[0]) {
      const file = req.files.video[0];
      const result = await uploadVideo(file.buffer, { folder: 'lms/carousel-videos' });
      req.carouselUploads.videoUrl = result.secure_url;
    }
    next();
  } catch (error) {
    console.error('Carousel upload error:', error);
    next(error);
  }
};

/**
 * Admin: Create carousel slide. Either image OR video (embed or upload), not both.
 */
export const createSlide = async (req, res, next) => {
  try {
    const imageUrl = req.carouselUploads?.imageUrl || req.body.image?.trim() || null;
    const videoEmbedUrl = req.body.videoEmbedUrl?.trim() || null;
    const videoUrl = req.carouselUploads?.videoUrl || req.body.videoUrl?.trim() || null;

    const hasImage = !!imageUrl;
    const hasVideo = !!(videoEmbedUrl || videoUrl);
    if (!hasImage && !hasVideo) {
      return res.status(400).json({
        success: false,
        message: 'Provide either an image or a video (embed URL or upload).',
      });
    }
    if (hasImage && hasVideo) {
      return res.status(400).json({
        success: false,
        message: 'Provide only one: image OR video, not both.',
      });
    }

    const altText = req.body.altText?.trim() || '';

    const maxOrder = await prisma.heroCarouselSlide.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const slide = await prisma.heroCarouselSlide.create({
      data: {
        image: hasImage ? imageUrl : null,
        altText,
        videoEmbedUrl: hasVideo ? (videoEmbedUrl || null) : null,
        videoUrl: hasVideo ? (videoUrl || null) : null,
        sortOrder,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Carousel slide created successfully',
      data: slide,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update carousel slide
 */
export const updateSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.heroCarouselSlide.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Slide not found' });
    }

    let imageUrl = req.carouselUploads?.imageUrl || req.body.image || existing.image;
    const altText = req.body.altText !== undefined ? String(req.body.altText).trim() : existing.altText;
    let videoEmbedUrl = existing.videoEmbedUrl;
    let videoUrl = existing.videoUrl;
    if (req.body.videoEmbedUrl !== undefined) {
      const v = String(req.body.videoEmbedUrl).trim();
      videoEmbedUrl = v || null;
      if (v) videoUrl = null;
    }
    if (req.carouselUploads?.videoUrl) {
      videoUrl = req.carouselUploads.videoUrl;
      videoEmbedUrl = null;
    } else if (req.body.videoUrl !== undefined) {
      videoUrl = String(req.body.videoUrl).trim() || null;
    }
    if (req.carouselUploads?.imageUrl) imageUrl = req.carouselUploads.imageUrl;

    const hasImage = !!imageUrl;
    const hasVideo = !!(videoEmbedUrl || videoUrl);
    if (hasImage && hasVideo) {
      return res.status(400).json({
        success: false,
        message: 'Provide only one: image OR video, not both.',
      });
    }
    if (!hasImage && !hasVideo) {
      return res.status(400).json({
        success: false,
        message: 'Slide must have either an image or a video.',
      });
    }

    const slide = await prisma.heroCarouselSlide.update({
      where: { id },
      data: {
        image: hasImage ? imageUrl : null,
        altText,
        videoEmbedUrl: hasVideo ? videoEmbedUrl : null,
        videoUrl: hasVideo ? videoUrl : null,
      },
    });

    res.json({
      success: true,
      message: 'Carousel slide updated successfully',
      data: slide,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete slide
 */
export const deleteSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.heroCarouselSlide.delete({ where: { id } });
    res.json({ success: true, message: 'Slide deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Slide not found' });
    }
    next(error);
  }
};

/**
 * Admin: Reorder slides
 */
export const reorderSlides = async (req, res, next) => {
  try {
    const { order } = req.body; // array of ids in desired order
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ success: false, message: 'order must be a non-empty array of slide ids' });
    }
    await Promise.all(
      order.map((id, index) =>
        prisma.heroCarouselSlide.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    const slides = await prisma.heroCarouselSlide.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: slides });
  } catch (error) {
    next(error);
  }
};

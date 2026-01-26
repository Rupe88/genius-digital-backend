import { singleUpload, processImageUpload } from '../middleware/cloudinaryUpload.js';

/**
 * Upload image to Cloudinary (no database record)
 * Returns the Cloudinary URL directly
 */
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    if (!req.cloudinary || !req.cloudinary.url) {
      return res.status(400).json({
        success: false,
        message: 'Image upload failed',
      });
    }

    res.json({
      success: true,
      data: {
        url: req.cloudinary.url,
        publicId: req.cloudinary.publicId,
        width: req.cloudinary.width,
        height: req.cloudinary.height,
        format: req.cloudinary.format,
      },
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
};

import multer from 'multer';
import { uploadImage, uploadVideo, uploadDocument } from '../services/cloudinaryService.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|webm|ogg|mov/;
  const allowedDocTypes = /pdf|doc|docx|txt/;

  const mimetype = file.mimetype;

  if (
    allowedImageTypes.test(mimetype) ||
    allowedVideoTypes.test(mimetype) ||
    allowedDocTypes.test(mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter,
});

/**
 * Middleware for single file upload
 */
export const singleUpload = (fieldName) => upload.single(fieldName);

/**
 * Middleware for multiple file uploads
 */
export const multipleUpload = (fieldName, maxCount = 10) =>
  upload.array(fieldName, maxCount);

/**
 * Middleware for mixed file uploads
 */
export const fieldsUpload = (fields) => upload.fields(fields);

/**
 * Upload image to Cloudinary after multer processing
 */
export const processImageUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Validate file buffer
    if (!Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file data',
      });
    }

    // Validate file size (max 10MB for images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.buffer.length > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit',
      });
    }

    const folder = req.body.folder || 'lms/images';
    const transformation = req.body.transformation || {};

    console.log(`Uploading image to Cloudinary folder: ${folder}, size: ${req.file.buffer.length} bytes, type: ${req.file.mimetype}`);

    // Add timeout to prevent hanging (30 seconds)
    const uploadPromise = uploadImage(req.file.buffer, {
      folder,
      transformation,
      mimeType: req.file.mimetype,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Image upload timed out after 30 seconds'));
      }, 30000);
    });

    const result = await Promise.race([uploadPromise, timeoutPromise]);

    req.cloudinary = {
      ...(req.cloudinary || {}),
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      type: 'image',
    };

    console.log(`✓ Image uploaded successfully: ${result.secure_url}`);
    next();
  } catch (error) {
    console.error('Image upload middleware error:', error);

    // Provide user-friendly error messages
    let errorMessage = 'Image upload failed';
    let statusCode = 400;

    if (error.message?.includes('authentication failed') || error.message?.includes('Invalid Signature')) {
      errorMessage = 'Cloudinary authentication failed. Please check your API credentials in .env file.';
      statusCode = 500;
    } else if (error.message?.includes('Invalid API Key')) {
      errorMessage = 'Cloudinary API key is invalid. Please check your credentials.';
      statusCode = 500;
    } else if (error.message?.includes('timed out')) {
      errorMessage = 'Image upload timed out. Please try again with a smaller file.';
      statusCode = 408;
    } else {
      errorMessage = error.message || 'Image upload failed';
    }

    // Return proper error response
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Upload video to Cloudinary after multer processing
 */
export const processVideoUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Validate file buffer
    if (!Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file data',
      });
    }

    // Validate file size (max 100MB for videos)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (req.file.buffer.length > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 100MB limit',
      });
    }

    const folder = req.body.folder || 'lms/videos';

    console.log(`Uploading video to Cloudinary folder: ${folder}, size: ${req.file.buffer.length} bytes`);

    // Add timeout to prevent hanging (60 seconds for videos)
    const uploadPromise = uploadVideo(req.file.buffer, {
      folder,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Video upload timed out after 60 seconds'));
      }, 60000);
    });

    const result = await Promise.race([uploadPromise, timeoutPromise]);

    req.cloudinary = {
      ...(req.cloudinary || {}),
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      format: result.format,
      type: 'video',
    };

    console.log(`✓ Video uploaded successfully: ${result.secure_url}`);
    next();
  } catch (error) {
    console.error('Video upload middleware error:', error);

    let errorMessage = 'Video upload failed';
    let statusCode = 400;

    if (error.message?.includes('timed out')) {
      errorMessage = 'Video upload timed out. Please try again with a smaller file.';
      statusCode = 408;
    } else {
      errorMessage = error.message || 'Video upload failed';
    }

    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Upload document to Cloudinary after multer processing
 */
export const processDocumentUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Validate file buffer
    if (!Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file data',
      });
    }

    // Validate file size (max 50MB for documents)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (req.file.buffer.length > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 50MB limit',
      });
    }

    const folder = req.body.folder || 'lms/documents';

    console.log(`Uploading document to Cloudinary folder: ${folder}, size: ${req.file.buffer.length} bytes`);

    const result = await uploadDocument(req.file.buffer, {
      folder,
    });

    req.cloudinary = {
      ...(req.cloudinary || {}),
      url: result.secure_url,
      publicId: result.public_id,
      type: 'document',
    };

    console.log(`✓ Document uploaded successfully: ${result.secure_url}`);
    next();
  } catch (error) {
    console.error('Document upload middleware error:', error);
    next(error);
  }
};

/**
 * Specific middleware for Lesson uploads (video and attachment)
 */
export const processLessonFiles = async (req, res, next) => {
  try {
    if (!req.files) {
      return next();
    }

    // Handle video upload
    if (req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      console.log(`Uploading lesson video: ${videoFile.originalname}`);
      const result = await uploadVideo(videoFile.buffer, {
        folder: req.body.folder || 'lms/videos',
      });
      req.cloudinary = {
        ...(req.cloudinary || {}),
        videoUrl: result.secure_url,
        videoDuration: result.duration,
      };
    }

    // Handle attachment upload
    if (req.files.attachment && req.files.attachment[0]) {
      const docFile = req.files.attachment[0];
      console.log(`Uploading lesson attachment: ${docFile.originalname}`);
      const result = await uploadDocument(docFile.buffer, {
        folder: req.body.folder || 'lms/documents',
      });
      req.cloudinary = {
        ...(req.cloudinary || {}),
        attachmentUrl: result.secure_url,
      };
    }

    next();
  } catch (error) {
    console.error('Lesson files upload error:', error);
    next(error);
  }
};

export default upload;



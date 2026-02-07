/**
 * Multipart upload middleware. Course/lesson thumbnails and videos use S3 only (s3Service).
 * req.cloudinary is the conventional name for upload results (url, videoUrl, etc.).
 */
import multer from 'multer';
import { config } from '../config/env.js';
import { uploadImage, uploadVideo, uploadDocument } from '../services/s3Service.js';

// Upload limits from config (bytes). Use max of all so multer accepts any allowed type up to video limit.
const imageMaxBytes = (config.upload?.imageMaxMb ?? 10) * 1024 * 1024;
const videoMaxBytes = (config.upload?.videoMaxMb ?? 3072) * 1024 * 1024;
const documentMaxBytes = (config.upload?.documentMaxMb ?? 50) * 1024 * 1024;
const multerFileSizeLimit = Math.max(imageMaxBytes, videoMaxBytes, documentMaxBytes);

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  // quicktime = .mov, mpeg = .mpeg/.mpg; x-m4v = .m4v
  const allowedVideoTypes = /mp4|webm|ogg|mov|quicktime|mpeg|x-m4v/;
  const allowedDocTypes = /pdf|doc|docx|txt/;

  const mimetype = (file.mimetype || '').toLowerCase();

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
    fileSize: multerFileSizeLimit,
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
 * Run multer + processMultipleImages only when Content-Type is multipart.
 * Prevents multer from hanging when client sends JSON or no body.
 */
export const optionalMultipleUpload = (fieldName, maxCount, processImagesFn) => {
  const multerMw = upload.array(fieldName, maxCount);
  return (req, res, next) => {
    if (!req.is('multipart/form-data')) {
      return next();
    }
    multerMw(req, res, (err) => {
      if (err) return next(err);
      Promise.resolve(processImagesFn(req, res, next)).catch(next);
    });
  };
};

/**
 * Run multer single file + processImageUpload only when Content-Type is multipart.
 * When client sends JSON (no image), skip multer so req.body stays from express.json().
 */
export const optionalSingleUpload = (fieldName, processImageFn) => {
  const multerMw = upload.single(fieldName);
  return (req, res, next) => {
    if (!req.is('multipart/form-data')) {
      return next();
    }
    multerMw(req, res, (err) => {
      if (err) return next(err);
      Promise.resolve(processImageFn(req, res, next)).catch(next);
    });
  };
};

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

    const maxSize = imageMaxBytes;
    if (req.file.buffer.length > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds ${config.upload?.imageMaxMb ?? 10}MB limit for images`,
      });
    }

    const folder = req.body.folder || 'lms/images';
    const transformation = req.body.transformation || {};

    console.log(`Uploading image to S3 folder: ${folder}, size: ${req.file.buffer.length} bytes, type: ${req.file.mimetype}`);

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

    if (error.message?.includes('S3 is not configured')) {
      errorMessage = 'Storage is not configured. Please set S3_ACCESS_KEY and S3_SECRET_KEY in .env';
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
 * Process multiple images upload
 */
export const processMultipleImagesUpload = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const folder = req.body.folder || 'lms/gallery';
    const maxSize = imageMaxBytes;
    const uploadPromises = req.files.map(async (file) => {
      if (file.size > maxSize) {
        throw new Error(`File ${file.originalname} exceeds ${config.upload?.imageMaxMb ?? 10}MB limit`);
      }

      const result = await uploadImage(file.buffer, {
        folder,
        mimeType: file.mimetype,
      });

      return result.secure_url;
    });

    const imageUrls = await Promise.all(uploadPromises);

    req.cloudinary = {
      ...(req.cloudinary || {}),
      imageUrls,
    };

    console.log(`✓ ${imageUrls.length} images uploaded successfully`);
    next();
  } catch (error) {
    console.error('Multiple images upload error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload images',
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

    const maxSize = videoMaxBytes;
    if (req.file.buffer.length > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds ${config.upload?.videoMaxMb ?? 3072}MB limit for videos`,
      });
    }

    const folder = req.body.folder || 'lms/videos';
    const timeoutMs = config.upload?.videoUploadTimeoutMs ?? 600000; // 10 min default

    console.log(`Uploading video to S3 folder: ${folder}, size: ${req.file.buffer.length} bytes, timeout: ${timeoutMs / 1000}s`);

    const uploadPromise = uploadVideo(req.file.buffer, {
      folder,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Video upload timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
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

    const maxSize = documentMaxBytes;
    if (req.file.buffer.length > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds ${config.upload?.documentMaxMb ?? 50}MB limit for documents`,
      });
    }

    const folder = req.body.folder || 'lms/documents';

    console.log(`Uploading document to S3 folder: ${folder}, size: ${req.file.buffer.length} bytes`);

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
 * Course create/update: thumbnail (image) + optional video file.
 * Uses S3 only (uploadImage/uploadVideo from s3Service). Expects req.files.thumbnail[0] and/or req.files.video[0].
 */
export const processCourseFiles = async (req, res, next) => {
  try {
    if (!req.files) return next();

    req.cloudinary = req.cloudinary || {};

    if (req.files.thumbnail && req.files.thumbnail[0]) {
      const file = req.files.thumbnail[0];
      if (Buffer.isBuffer(file.buffer) && file.buffer.length > 0) {
        if (file.buffer.length > imageMaxBytes) {
          return res.status(400).json({ success: false, message: `Thumbnail exceeds ${config.upload?.imageMaxMb ?? 10}MB limit` });
        }
        console.log('[Course upload] Uploading thumbnail to S3, size:', file.buffer.length);
        const result = await uploadImage(file.buffer, { folder: req.body.folder || 'lms/images', mimeType: file.mimetype });
        req.cloudinary.url = result.secure_url;
        req.cloudinary.publicId = result.public_id;
        console.log('[Course upload] Thumbnail S3 URL:', result.secure_url);
      }
    }

    if (req.files.video && req.files.video[0]) {
      const file = req.files.video[0];
      if (Buffer.isBuffer(file.buffer) && file.buffer.length > 0) {
        if (file.buffer.length > videoMaxBytes) {
          return res.status(400).json({ success: false, message: `Video exceeds ${config.upload?.videoMaxMb ?? 3072}MB limit` });
        }
        const videoTimeoutMs = config.upload?.videoUploadTimeoutMs ?? 600000;
        console.log('[Course upload] Uploading video to S3, size:', file.buffer.length);
        const uploadPromise = uploadVideo(file.buffer, { folder: req.body.folder || 'lms/videos', mimeType: file.mimetype });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Video upload timed out after ${videoTimeoutMs / 1000}s`)), videoTimeoutMs)
        );
        const result = await Promise.race([uploadPromise, timeoutPromise]);
        req.cloudinary.videoUrl = result.secure_url;
        console.log('[Course upload] Video S3 URL:', result.secure_url);
      }
    }

    next();
  } catch (error) {
    console.error('[Course upload] S3 upload error:', error);
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

    // Handle video upload (same size limit as multer; timeout for large files)
    if (req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      console.log(`Uploading lesson video: ${videoFile.originalname}, size: ${videoFile.buffer?.length ?? 0} bytes`);
      const videoTimeoutMs = config.upload?.videoUploadTimeoutMs ?? 600000;
      const uploadPromise = uploadVideo(videoFile.buffer, {
        folder: req.body.folder || 'lms/videos',
        mimeType: videoFile.mimetype,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Video upload timed out after ${videoTimeoutMs / 1000}s`)), videoTimeoutMs)
      );
      const result = await Promise.race([uploadPromise, timeoutPromise]);
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

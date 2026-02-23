/**
 * Multipart upload middleware. Course/lesson thumbnails and videos use S3 only (s3Service).
 * req.cloudinary is the conventional name for upload results (url, videoUrl, etc.).
 */
import multer from 'multer';
import { config } from '../config/env.js';
import { uploadImage, uploadVideo, uploadDocument } from '../services/s3Service.js';
import { optimizeVideoBuffer } from '../services/videoOptimizationService.js';

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

    // Optimize video buffer before upload if enabled
    let videoBuffer = req.file.buffer;
    if (config.upload?.videoOptimizationEnabled) {
      try {
        console.log('[Video optimization] Starting optimization...');
        const optimizedBuffer = await optimizeVideoBuffer(videoBuffer, {
          timeout: config.upload?.videoOptimizationTimeoutMs || 300000,
        });
        videoBuffer = optimizedBuffer;
        console.log('[Video optimization] Optimization successful');
      } catch (error) {
        console.warn('[Video optimization] Optimization failed, using original:', error.message);
        // Continue with original buffer (graceful fallback)
      }
    }

    console.log(`Uploading video to S3 folder: ${folder}, size: ${videoBuffer.length} bytes, timeout: ${timeoutMs / 1000}s`);

    const uploadPromise = uploadVideo(videoBuffer, {
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

const MAX_PROMO_VIDEOS = 5;

/**
 * Upload a single video buffer to S3 (used for course promo videos).
 */
async function uploadOneCourseVideo(file, reqBodyFolder) {
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) return null;
  if (file.buffer.length > videoMaxBytes) {
    throw new Error(`Video exceeds ${config.upload?.videoMaxMb ?? 3072}MB limit`);
  }
  let videoBuffer = file.buffer;
  if (config.upload?.videoOptimizationEnabled) {
    try {
      videoBuffer = await optimizeVideoBuffer(videoBuffer, {
        timeout: config.upload?.videoOptimizationTimeoutMs || 300000,
      });
    } catch (e) {
      console.warn('[Course upload] Video optimization failed, using original:', e?.message);
    }
  }
  const videoTimeoutMs = config.upload?.videoUploadTimeoutMs ?? 600000;
  const uploadPromise = uploadVideo(videoBuffer, { folder: reqBodyFolder || 'lms/videos', mimeType: file.mimetype });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Video upload timed out after ${videoTimeoutMs / 1000}s`)), videoTimeoutMs)
  );
  const result = await Promise.race([uploadPromise, timeoutPromise]);
  return result?.secure_url ?? null;
}

/**
 * Course create/update: thumbnail (image) + optional 1–5 promo videos (URLs and/or file uploads).
 * Uses S3 only. Expects req.files.thumbnail[0] and/or req.files.video[] (up to 5).
 * When body.promoVideoSlots is present (JSON array of { type: 'url', url } | { type: 'file' }), builds req.cloudinary.promoVideos and sets videoUrl = first.
 */
export const processCourseFiles = async (req, res, next) => {
  try {
    req.cloudinary = req.cloudinary || {};

    if (req.files?.thumbnail?.[0]) {
      const file = req.files.thumbnail[0];
      if (Buffer.isBuffer(file.buffer) && file.buffer.length > 0) {
        if (file.buffer.length > imageMaxBytes) {
          return res.status(400).json({ success: false, message: `Thumbnail exceeds ${config.upload?.imageMaxMb ?? 10}MB limit` });
        }
        console.log('[Course upload] Uploading thumbnail to S3, size:', file.buffer.length);
        const result = await uploadImage(file.buffer, { folder: req.body.folder || 'lms/images', mimeType: file.mimetype });
        req.cloudinary.url = result.secure_url;
        req.cloudinary.publicId = result.public_id;
      }
    }

    const videoFiles = req.files?.video && Array.isArray(req.files.video) ? req.files.video : [];
    let promoVideoSlots = null;
    try {
      const raw = req.body.promoVideoSlots;
      if (raw) promoVideoSlots = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.warn('[Course upload] Invalid promoVideoSlots JSON:', e?.message);
    }

    if (promoVideoSlots && Array.isArray(promoVideoSlots) && promoVideoSlots.length > 0) {
      const folder = req.body.folder || 'lms/videos';
      const urls = [];
      let fileIndex = 0;
      for (let i = 0; i < Math.min(promoVideoSlots.length, MAX_PROMO_VIDEOS); i++) {
        const slot = promoVideoSlots[i];
        if (slot?.type === 'file') {
          const file = videoFiles[fileIndex];
          fileIndex++;
          if (file) {
            try {
              const url = await uploadOneCourseVideo(file, folder);
              if (url) urls.push(url);
            } catch (err) {
              console.error('[Course upload] Video upload failed:', err?.message);
              return res.status(400).json({ success: false, message: err?.message || 'Video upload failed' });
            }
          }
        } else if (slot?.type === 'url' && typeof slot.url === 'string' && slot.url.trim()) {
          urls.push(slot.url.trim());
        }
      }
      req.cloudinary.promoVideos = urls.slice(0, MAX_PROMO_VIDEOS);
      req.cloudinary.videoUrl = req.cloudinary.promoVideos[0] || null;
      if (req.cloudinary.promoVideos.length) {
        console.log('[Course upload] Promo videos:', req.cloudinary.promoVideos.length);
      }
    } else if (videoFiles.length > 0 && videoFiles[0]) {
      const file = videoFiles[0];
      if (Buffer.isBuffer(file.buffer) && file.buffer.length > 0) {
        try {
          const url = await uploadOneCourseVideo(file, req.body.folder || 'lms/videos');
          req.cloudinary.videoUrl = url;
          req.cloudinary.promoVideos = url ? [url] : [];
        } catch (err) {
          return res.status(400).json({ success: false, message: err?.message || 'Video upload failed' });
        }
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
      
      // Optimize video buffer before upload if enabled
      let videoBuffer = videoFile.buffer;
      if (config.upload?.videoOptimizationEnabled) {
        try {
          console.log('[Lesson upload] Starting video optimization...');
          const optimizedBuffer = await optimizeVideoBuffer(videoBuffer, {
            timeout: config.upload?.videoOptimizationTimeoutMs || 300000,
          });
          videoBuffer = optimizedBuffer;
          console.log('[Lesson upload] Video optimization successful');
        } catch (error) {
          console.warn('[Lesson upload] Video optimization failed, using original:', error.message);
          // Continue with original buffer (graceful fallback)
        }
      }
      
      const videoTimeoutMs = config.upload?.videoUploadTimeoutMs ?? 600000;
      const uploadPromise = uploadVideo(videoBuffer, {
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

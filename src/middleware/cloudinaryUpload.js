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

function storageErrorResponse(err) {
  const name = err?.name || '';
  const msg = typeof err?.message === 'string' ? err.message : '';
  if (name === 'ServiceUnavailable' || msg.includes('temporary failure of the server')) {
    return {
      status: 503,
      message:
        'Image/video storage is temporarily unavailable. Save the course without uploads and add a thumbnail or promo video from the edit page later.',
    };
  }
  if (err?.code === 'ECONNRESET' || msg.includes('socket hang up')) {
    return {
      status: 503,
      message: 'Upload was interrupted. Try a smaller file or retry in a few minutes.',
    };
  }
  if (msg.includes('S3 is not configured')) {
    return { status: 503, message: 'File storage is not configured on the server.' };
  }
  return { status: 400, message: msg || 'File upload failed' };
}

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  // quicktime = .mov, mpeg = .mpeg/.mpg; x-m4v = .m4v
  const allowedVideoTypes = /mp4|webm|ogg|mov|quicktime|mpeg|x-m4v/;
  // Includes Office Open XML presentation (.pptx) and legacy PowerPoint (.ppt)
  const allowedDocTypes = /pdf|doc|docx|txt|presentationml|ms-powerpoint/;

  const mimetype = (file.mimetype || '').toLowerCase();
  const original = (file.originalname || '').toLowerCase();
  const docByExtension = /\.(pdf|doc|docx|txt|ppt|pptx)$/i.test(original);
  const docOctetStream =
    docByExtension && (mimetype === 'application/octet-stream' || mimetype === 'binary/octet-stream' || !mimetype);

  if (
    allowedImageTypes.test(mimetype) ||
    allowedVideoTypes.test(mimetype) ||
    allowedDocTypes.test(mimetype) ||
    docOctetStream
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
 * Gallery-specific upload handler: supports multiple images and a single video file.
 * - Images: expect in req.files.files (create) or req.files.file (update), saved to lms/gallery
 * - Video: expect in req.files.video[0], saved to lms/videos
 *
 * Populates:
 * - req.cloudinary.imageUrls: string[]
 * - req.cloudinary.videoUrl: string | undefined
 */
export const processGalleryFiles = async (req, res, next) => {
  try {
    const folderImages = req.body.folder || 'lms/gallery';
    const folderVideos = req.body.videoFolder || 'lms/videos';

    const allImageFiles = [];
    if (req.files) {
      if (Array.isArray(req.files.files)) {
        allImageFiles.push(...req.files.files);
      }
      if (Array.isArray(req.files.file)) {
        allImageFiles.push(...req.files.file);
      }
    }

    if (allImageFiles.length > 0) {
      const maxSize = imageMaxBytes;
      const uploadPromises = allImageFiles.map(async (file) => {
        if (file.size > maxSize) {
          throw new Error(`File ${file.originalname} exceeds ${config.upload?.imageMaxMb ?? 10}MB limit`);
        }

        const result = await uploadImage(file.buffer, {
          folder: folderImages,
          mimeType: file.mimetype,
        });

        return result.secure_url;
      });

      const imageUrls = await Promise.all(uploadPromises);

      req.cloudinary = {
        ...(req.cloudinary || {}),
        imageUrls,
      };

      console.log(`✓ ${imageUrls.length} gallery images uploaded successfully`);
    }

    const videoFiles = req.files && Array.isArray(req.files.video) ? req.files.video : [];
    if (videoFiles.length > 0 && videoFiles[0]) {
      const file = videoFiles[0];
      if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid video file data',
        });
      }

      if (file.buffer.length > videoMaxBytes) {
        return res.status(400).json({
          success: false,
          message: `Video exceeds ${config.upload?.videoMaxMb ?? 3072}MB limit`,
        });
      }

      const videoTimeoutMs = config.upload?.videoUploadTimeoutMs ?? 600000;
      console.log('[Gallery upload] Uploading video to S3, size:', file.buffer.length, 'bytes');

      const uploadPromise = uploadVideo(file.buffer, {
        folder: folderVideos,
        mimeType: file.mimetype,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Video upload timed out after ${videoTimeoutMs / 1000}s`)), videoTimeoutMs)
      );
      const result = await Promise.race([uploadPromise, timeoutPromise]);

      req.cloudinary = {
        ...(req.cloudinary || {}),
        videoUrl: result.secure_url,
      };

      console.log('[Gallery upload] Video uploaded successfully');
    }

    return next();
  } catch (error) {
    console.error('Gallery files upload error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload gallery media',
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
      mimeType: resolveDocumentMimeType(req.file),
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
 * Skips FFmpeg optimization so the request returns quickly; large files would otherwise
 * block for 5+ minutes at 99% while the server runs optimization.
 */
async function uploadOneCourseVideo(file, reqBodyFolder) {
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) return null;
  if (file.buffer.length > videoMaxBytes) {
    throw new Error(`Video exceeds ${config.upload?.videoMaxMb ?? 3072}MB limit`);
  }
  const videoBuffer = file.buffer;
  const videoTimeoutMs = config.upload?.videoUploadTimeoutMs ?? 600000;
  console.log('[Course upload] Uploading video to S3, size:', videoBuffer.length, 'bytes (optimization skipped for faster response)');
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
        try {
          const result = await uploadImage(file.buffer, {
            folder: req.body.folder || 'lms/images',
            mimeType: file.mimetype,
          });
          req.cloudinary.url = result.secure_url;
          req.cloudinary.publicId = result.public_id;
        } catch (thumbErr) {
          console.error('[Course upload] Thumbnail S3 error:', thumbErr?.message || thumbErr);
          const { status, message } = storageErrorResponse(thumbErr);
          return res.status(status).json({ success: false, message });
        }
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
              const { status, message } = storageErrorResponse(err);
              return res.status(status).json({ success: false, message });
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
          const { status, message } = storageErrorResponse(err);
          return res.status(status).json({ success: false, message });
        }
      }
    }

    next();
  } catch (error) {
    console.error('[Course upload] S3 upload error:', error);
    const { status, message } = storageErrorResponse(error);
    return res.status(status).json({ success: false, message });
  }
};

/** When the client sends octet-stream or empty MIME, infer from filename so S3 keys get a real extension. */
function resolveDocumentMimeType(file) {
  const raw = (file?.mimetype || '').trim();
  if (raw && raw !== 'application/octet-stream' && raw !== 'binary/octet-stream') {
    return raw;
  }
  const name = (file?.originalname || '').toLowerCase();
  if (name.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (name.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.txt')) return 'text/plain';
  return raw || 'application/octet-stream';
}

/**
 * Specific middleware for Lesson uploads (video and attachment)
 */
export const processLessonFiles = async (req, res, next) => {
  try {
    if (!req.files) {
      return next();
    }

    // Handle video upload (same size limit as multer; timeout for large files)
    // Optimization skipped for faster response (avoids 99% hang like course promo)
    if (req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      console.log(`Uploading lesson video: ${videoFile.originalname}, size: ${videoFile.buffer?.length ?? 0} bytes`);
      const videoBuffer = videoFile.buffer;
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
        mimeType: resolveDocumentMimeType(docFile),
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

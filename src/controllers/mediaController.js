/**
 * Secure video streaming: token-based access so S3 URLs are never exposed.
 * Only authorized users (enrolled or preview) get a short-lived stream URL.
 */

import { prisma } from '../config/database.js';
import { generateVideoStreamToken, verifyVideoStreamToken } from '../services/tokenService.js';
import { generateImageToken, verifyImageToken } from '../services/tokenService.js';
import { getBackendBaseUrl } from '../utils/helpers.js';
import {
  isS3Configured,
  isOurS3Url,
  getS3KeyFromStoredUrl,
  getObjectStream,
  getObjectContentLength,
  getSignedUrlForMediaUrl,
} from '../services/s3Service.js';

const API_BASE = process.env.API_BASE_PATH !== undefined ? process.env.API_BASE_PATH : '/api';

/** First chunk size (bytes) so playback can start; needs to include MP4 moov atom (often at start for faststart, else up to ~10MB). */
const FIRST_CHUNK_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * GET /api/media/video-token?lessonId=xxx | ?courseId=xxx&type=promo
 * Returns backend stream URL so video is served in chunks (play after first chunk, not full download).
 * Set USE_SIGNED_VIDEO_URL=true to return signed S3 URL instead (when server cannot reach S3).
 * Lesson: login required. Promo: no login required.
 */
export const getVideoToken = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const base = getBackendBaseUrl(req);
    const { lessonId, courseId, type } = req.query;
    const useSignedUrl = process.env.USE_SIGNED_VIDEO_URL === 'true';

    if (lessonId) {
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Login required to watch lessons' });
      }
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          course: {
            select: {
              instructorId: true,
              enrollments: {
                where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
                select: { id: true },
              },
            },
          },
        },
      });
      if (!lesson) {
        return res.status(404).json({ success: false, message: 'Lesson not found' });
      }
      const isEnrolled = lesson.course.enrollments?.length > 0;
      const isInstructor = lesson.course.instructorId === userId;
      const isAdmin = req.user?.role === 'ADMIN';
      if (!lesson.isPreview && !isEnrolled && !isInstructor && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Enroll in the course to watch this lesson',
        });
      }
      if (!lesson.videoUrl) {
        return res.status(404).json({ success: false, message: 'No video for this lesson' });
      }
      if (useSignedUrl && isS3Configured() && isOurS3Url(lesson.videoUrl)) {
        try {
          const signedUrl = await getSignedUrlForMediaUrl(lesson.videoUrl, 3600);
          return res.json({ success: true, url: signedUrl });
        } catch (err) {
          console.warn('[video-token] Signed URL failed for lesson:', err?.message);
        }
      }
      const token = generateVideoStreamToken({ type: 'lesson', lessonId });
      const path = `${API_BASE}/media/stream/lesson/${lessonId}`;
      const url = `${base}/${path.startsWith('/') ? path.slice(1) : path}?token=${token}`;
      return res.json({ success: true, url });
    }

    if (courseId && type === 'promo') {
      const course = await prisma.course.findFirst({
        where: {
          OR: [{ id: courseId }, { slug: courseId }],
        },
        select: { id: true, videoUrl: true },
      });
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      if (!course.videoUrl) {
        return res.status(404).json({ success: false, message: 'No preview video for this course' });
      }
      if (useSignedUrl && isS3Configured() && isOurS3Url(course.videoUrl)) {
        try {
          const signedUrl = await getSignedUrlForMediaUrl(course.videoUrl, 3600);
          return res.json({ success: true, url: signedUrl });
        } catch (err) {
          console.warn('[video-token] Signed URL failed for promo:', err?.message);
        }
      }
      const token = generateVideoStreamToken({ type: 'promo', courseId: course.id });
      const path = `${API_BASE}/media/stream/course/${course.id}/promo`;
      const url = `${base}/${path.startsWith('/') ? path.slice(1) : path}?token=${token}`;
      return res.json({ success: true, url });
    }

    return res.status(400).json({
      success: false,
      message: 'Provide lessonId (for lessons) or courseId and type=promo (for preview video). Login not required for preview.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Internal helper to stream an S3 object to the response with proper range support.
 * Follows standard HTTP range request behavior for video players.
 */
async function streamS3Object(req, res, key) {
  const logPrefix = `[stream:${key.slice(-10)}]`;
  try {
    const rangeHeader = req.headers.range;

    // 1. Get total content length first (needed for proper Range headers)
    const totalSize = await getObjectContentLength(key);
    if (totalSize <= 0) {
      return res.status(404).json({ success: false, message: 'Video file is empty' });
    }

    let start = 0;
    let end = totalSize - 1;
    let isPartial = false;

    // Default chunk size for 'forced chunking' (1MB) - provides a smoother start for large files
    const MAX_CHUNK_SIZE = 1 * 1024 * 1024;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      const endPart = parts[1];

      // If browser says "bytes=0-", we take a 1MB chunk. If it asks for specific range, we respect it.
      if (!endPart) {
        end = Math.min(start + MAX_CHUNK_SIZE - 1, totalSize - 1);
      } else {
        end = parseInt(endPart, 10);
      }

      if (start >= totalSize) {
        res.setHeader('Content-Range', `bytes */${totalSize}`);
        return res.status(416).send('Requested Range Not Satisfiable');
      }

      if (end >= totalSize) end = totalSize - 1;
      isPartial = true;
    } else {
      // No range provided? We still force a partial chunk response so browsers switch to Range mode
      end = Math.min(MAX_CHUNK_SIZE - 1, totalSize - 1);
      isPartial = true;
    }

    const chunkSize = (end - start) + 1;
    const s3Range = `bytes=${start}-${end}`;

    console.log(`${logPrefix} Serving ${s3Range}/${totalSize} (${chunkSize} bytes)`);

    const result = await getObjectStream(key, s3Range);
    const stream = result.stream;

    // Headers
    const origin = req.get('origin');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    }

    const mimeType = (result.contentType && result.contentType !== 'application/octet-stream')
      ? result.contentType
      : (key.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'video/mp4');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', chunkSize);
    res.setHeader('Content-Disposition', 'inline');

    if (isPartial) {
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    } else {
      res.status(200);
    }

    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    stream.pipe(res);

    stream.on('error', (err) => {
      console.error(`${logPrefix} Pipe error:`, err?.message || err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Stream error' });
      } else {
        res.destroy();
      }
    });

    res.on('close', () => {
      if (stream && typeof stream.destroy === 'function') stream.destroy();
    });

  } catch (err) {
    const code = err?.name || err?.code || 'Unknown';
    console.error(`[stream] S3 error for ${key}:`, code, err.message);
    if (!res.headersSent) {
      if (code === 'NoSuchKey' || code === '404') {
        return res.status(404).json({ success: false, message: 'Video file not found' });
      }
      return res.status(502).json({ success: false, message: 'Storage temporarily unavailable' });
    }
  }
}

/**
 * Stream lesson video. Token in query. No auth header (so <video src> works).
 */
export const streamLessonVideo = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const token = req.query.token;
    if (!lessonId) return res.status(400).json({ success: false, message: 'Lesson ID is required' });
    if (!token) return res.status(401).json({ success: false, message: 'Video link required' });

    let decoded;
    try {
      decoded = verifyVideoStreamToken(token);
    } catch {
      return res.status(403).json({ success: false, message: 'Video link expired' });
    }

    if (decoded.type !== 'lesson' || decoded.lessonId !== lessonId) {
      return res.status(403).json({ success: false, message: 'Invalid video link' });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { videoUrl: true },
    });

    if (!lesson?.videoUrl) return res.status(404).json({ success: false, message: 'No video found' });
    if (!isS3Configured() || !isOurS3Url(lesson.videoUrl)) {
      return res.status(400).json({ success: false, message: 'Secure stream not available' });
    }

    const key = getS3KeyFromStoredUrl(lesson.videoUrl);
    if (!key) return res.status(404).json({ success: false, message: 'Invalid video key' });

    await streamS3Object(req, res, key);
  } catch (error) {
    next(error);
  }
};

/**
 * Stream course promo video. Token in query. No login required for preview.
 */
export const streamCoursePromo = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const token = req.query.token;
    if (!courseId) return res.status(400).json({ success: false, message: 'Course ID is required' });
    if (!token) return res.status(401).json({ success: false, message: 'Preview link required' });

    let decoded;
    try {
      decoded = verifyVideoStreamToken(token);
    } catch {
      return res.status(403).json({ success: false, message: 'Preview link expired' });
    }

    if (decoded.type !== 'promo' || decoded.courseId !== courseId) {
      return res.status(403).json({ success: false, message: 'Invalid preview link' });
    }

    // Support both ID and Slug
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }],
      },
      select: { videoUrl: true },
    });

    if (!course?.videoUrl) return res.status(404).json({ success: false, message: 'No preview video found' });
    if (!isS3Configured() || !isOurS3Url(course.videoUrl)) {
      return res.status(400).json({ success: false, message: 'Secure preview not available' });
    }

    const key = getS3KeyFromStoredUrl(course.videoUrl);
    if (!key) return res.status(404).json({ success: false, message: 'Invalid preview key' });

    await streamS3Object(req, res, key);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/media/image?token=JWT | ?url=ENCODED_S3_URL
 * Token: no S3 URL exposed. Payload { type: 'courseThumbnail'|'lessonThumbnail', id }.
 * Url: legacy proxy (S3 URL in query). Prefer token for security.
 */
export const streamImage = async (req, res, next) => {
  try {
    if (!isS3Configured()) {
      return res.status(400).json({ success: false, message: 'Image not available' });
    }

    let key = null;

    const tokenParam = req.query.token;
    if (tokenParam && typeof tokenParam === 'string') {
      let decoded;
      try {
        decoded = verifyImageToken(tokenParam);
      } catch {
        return res.status(403).json({ success: false, message: 'Image link expired or invalid' });
      }
      const { type, id } = decoded;
      if (type === 'courseThumbnail' && id) {
        const course = await prisma.course.findUnique({
          where: { id },
          select: { thumbnail: true },
        });
        if (course?.thumbnail && isOurS3Url(course.thumbnail)) {
          key = getS3KeyFromStoredUrl(course.thumbnail);
        }
      } else if (type === 'lessonThumbnail' && id) {
        const lesson = await prisma.lesson.findUnique({
          where: { id },
          select: { thumbnail: true },
        });
        if (lesson?.thumbnail && isOurS3Url(lesson.thumbnail)) {
          key = getS3KeyFromStoredUrl(lesson.thumbnail);
        }
      }
      if (!key) return res.status(404).json({ success: false, message: 'Image not found' });
    } else {
      const rawUrl = req.query.url;
      if (!rawUrl || typeof rawUrl !== 'string') {
        return res.status(400).json({ success: false, message: 'Missing token or url parameter' });
      }
      let url;
      try {
        url = decodeURIComponent(rawUrl.trim());
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid url' });
      }
      if (isOurS3Url(url)) {
        key = getS3KeyFromStoredUrl(url);
      } else if (url && !url.startsWith('http') && !url.includes('..')) {
        key = url.replace(/^\//, '');
      }
      if (!key) return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const { stream, contentLength, contentType } = await getObjectStream(key);

    res.setHeader('Content-Type', contentType || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', contentLength);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Stream error' });
      else res.destroy();
    });
  } catch (error) {
    const isSignatureMismatch = error?.name === 'SignatureDoesNotMatch' ||
      (error?.message && String(error.message).includes('signature we calculated does not match'));
    if (isSignatureMismatch) {
      console.error(
        'S3 SignatureDoesNotMatch: Check S3_ACCESS_KEY and S3_SECRET_KEY in production. ' +
        'Ensure the secret is set exactly (no extra spaces, no quotes around the value). ' +
        'If the secret contains = or /, set it as an encrypted env var and paste the full string.'
      );
    }
    next(error);
  }
};

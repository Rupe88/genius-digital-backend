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
  getSignedUrlForMediaUrl,
} from '../services/s3Service.js';

const API_BASE = process.env.API_BASE_PATH !== undefined ? process.env.API_BASE_PATH : '/api';

/**
 * GET /api/media/video-token?lessonId=xxx | ?courseId=xxx&type=promo
 * Returns a short-lived signed S3 URL for direct playback (browser fetches from S3).
 * Lesson: auth required. Promo: public (no auth).
 */
export const getVideoToken = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const base = getBackendBaseUrl(req);
    const { lessonId, courseId, type } = req.query;

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
      if (isS3Configured() && isOurS3Url(lesson.videoUrl)) {
        try {
          const signedUrl = await getSignedUrlForMediaUrl(lesson.videoUrl, 3600);
          return res.json({ success: true, url: signedUrl });
        } catch (err) {
          console.error('[video-token] Signed URL failed for lesson:', err?.message);
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
        return res.status(404).json({ success: false, message: 'No promo video' });
      }
      if (isS3Configured() && isOurS3Url(course.videoUrl)) {
        try {
          const signedUrl = await getSignedUrlForMediaUrl(course.videoUrl, 3600);
          return res.json({ success: true, url: signedUrl });
        } catch (err) {
          console.error('[video-token] Signed URL failed for promo:', err?.message);
        }
      }
      const token = generateVideoStreamToken({ type: 'promo', courseId: course.id });
      const path = `${API_BASE}/media/stream/course/${course.id}/promo`;
      const url = `${base}/${path.startsWith('/') ? path.slice(1) : path}?token=${token}`;
      return res.json({ success: true, url });
    }

    return res.status(400).json({
      success: false,
      message: 'Provide lessonId or courseId with type=promo',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream lesson video. Token in query. No auth header (so <video src> works).
 */
export const streamLessonVideo = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Video link required' });
    }
    let decoded;
    try {
      decoded = verifyVideoStreamToken(token);
    } catch {
      return res.status(403).json({ success: false, message: 'Video link expired or invalid' });
    }
    if (decoded.type !== 'lesson' || decoded.lessonId !== lessonId) {
      return res.status(403).json({ success: false, message: 'Invalid video link' });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { videoUrl: true },
    });
    if (!lesson?.videoUrl) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    if (!isS3Configured() || !isOurS3Url(lesson.videoUrl)) {
      return res.status(400).json({ success: false, message: 'Stream not available for this video' });
    }

    const key = getS3KeyFromStoredUrl(lesson.videoUrl);
    if (!key) return res.status(404).json({ success: false, message: 'Video not found' });

    let stream; let contentLength; let contentType; let contentRange;
    try {
      const range = req.headers.range || null;
      const result = await getObjectStream(key, range);
      stream = result.stream;
      contentLength = result.contentLength;
      contentType = result.contentType;
      contentRange = result.contentRange;
    } catch (s3Err) {
      const code = s3Err?.name || s3Err?.code || 'Unknown';
      const msg = s3Err?.message || String(s3Err);
      console.error('Lesson stream S3 getObject failed:', key, code, msg);
      if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || msg.includes('fetch')) {
        console.error('Server cannot reach S3. Set USE_SIGNED_VIDEO_URL=true so the browser fetches video directly.');
      }
      return res.status(502).json({ success: false, message: 'Video unavailable. Try again later.' });
    }

    const origin = req.get('origin');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    }
    const type = (contentType && contentType !== 'application/octet-stream') ? contentType : (key.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'video/mp4');
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Accept-Ranges', 'bytes');

    if (contentRange) {
      res.status(206);
      res.setHeader('Content-Range', contentRange);
      res.setHeader('Content-Length', contentLength);
    } else {
      res.setHeader('Content-Length', contentLength);
    }

    stream.pipe(res);
    stream.on('error', (err) => {
      console.error('Lesson stream pipe error:', err?.message || err);
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Stream error' });
      else res.destroy();
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream course promo video. Token in query.
 */
export const streamCoursePromo = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Video link required' });
    }
    let decoded;
    try {
      decoded = verifyVideoStreamToken(token);
    } catch (err) {
      return res.status(403).json({ success: false, message: 'Video link expired or invalid' });
    }
    if (decoded.type !== 'promo' || decoded.courseId !== courseId) {
      return res.status(403).json({ success: false, message: 'Invalid video link' });
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId },
      select: { videoUrl: true },
    });
    if (!course?.videoUrl) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    if (!isS3Configured() || !isOurS3Url(course.videoUrl)) {
      return res.status(400).json({ success: false, message: 'Stream not available for this video' });
    }

    const key = getS3KeyFromStoredUrl(course.videoUrl);
    if (!key) return res.status(404).json({ success: false, message: 'Video not found' });

    let stream; let contentLength; let contentType; let contentRange;
    try {
      const range = req.headers.range || null;
      const result = await getObjectStream(key, range);
      stream = result.stream;
      contentLength = result.contentLength;
      contentType = result.contentType;
      contentRange = result.contentRange;
    } catch (s3Err) {
      const code = s3Err?.name || s3Err?.code || 'Unknown';
      const msg = s3Err?.message || String(s3Err);
      console.error('Promo stream S3 getObject failed:', key, code, msg);
      if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || msg.includes('fetch')) {
        console.error('Server cannot reach S3. Set USE_SIGNED_VIDEO_URL=true so the browser fetches video directly.');
      }
      return res.status(502).json({ success: false, message: 'Video unavailable. Try again later.' });
    }

    const origin = req.get('origin');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    }
    const type = (contentType && contentType !== 'application/octet-stream') ? contentType : (key.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'video/mp4');
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Accept-Ranges', 'bytes');

    if (contentRange) {
      res.status(206);
      res.setHeader('Content-Range', contentRange);
      res.setHeader('Content-Length', contentLength);
    } else {
      res.setHeader('Content-Length', contentLength);
    }

    stream.pipe(res);
    stream.on('error', (err) => {
      console.error('Promo stream pipe error:', err?.message || err);
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Stream error' });
      else res.destroy();
    });
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

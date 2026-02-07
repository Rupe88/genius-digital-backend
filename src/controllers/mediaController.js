/**
 * Secure video streaming: token-based access so S3 URLs are never exposed.
 * Only authorized users (enrolled or preview) get a short-lived stream URL.
 */

import { prisma } from '../config/database.js';
import { config } from '../config/env.js';
import { generateVideoStreamToken, verifyVideoStreamToken } from '../services/tokenService.js';
import {
  isS3Configured,
  isOurS3Url,
  getS3KeyFromStoredUrl,
  getObjectStream,
} from '../services/s3Service.js';

const API_BASE = process.env.API_BASE_PATH !== undefined ? process.env.API_BASE_PATH : '/api';

/**
 * GET /api/media/video-token?lessonId=xxx | ?courseId=xxx&type=promo
 * Returns a short-lived URL with token for the <video> element. Auth required.
 */
export const getVideoToken = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Login required to watch' });
    }

    const { lessonId, courseId, type } = req.query;

    if (lessonId) {
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
      const token = generateVideoStreamToken({ type: 'lesson', lessonId });
      const base = config.backendUrl.replace(/\/$/, '');
      const path = `${API_BASE}/media/stream/lesson/${lessonId}`;
      const url = `${base}/${path.startsWith('/') ? path.slice(1) : path}?token=${token}`;
      return res.json({ success: true, url });
    }

    if (courseId && type === 'promo') {
      const course = await prisma.course.findFirst({
        where: {
          OR: [{ id: courseId }, { slug: courseId }],
        },
        select: {
          id: true,
          instructorId: true,
          videoUrl: true,
          enrollments: {
            where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
            select: { id: true },
          },
        },
      });
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      const isEnrolled = course.enrollments?.length > 0;
      const isInstructor = course.instructorId === userId;
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isEnrolled && !isInstructor && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Enroll in the course to watch the promo',
        });
      }
      if (!course.videoUrl) {
        return res.status(404).json({ success: false, message: 'No promo video' });
      }
      const token = generateVideoStreamToken({ type: 'promo', courseId: course.id });
      const base = config.backendUrl.replace(/\/$/, '');
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

    const range = req.headers.range || null;
    const { stream, contentLength, contentType, contentRange } = await getObjectStream(key, range);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    if (contentRange) {
      res.status(206);
      res.setHeader('Content-Range', contentRange);
      res.setHeader('Content-Length', contentLength);
    } else {
      res.setHeader('Content-Length', contentLength);
    }

    stream.pipe(res);
    stream.on('error', () => {
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
    } catch {
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

    const range = req.headers.range || null;
    const { stream, contentLength, contentType, contentRange } = await getObjectStream(key, range);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    if (contentRange) {
      res.status(206);
      res.setHeader('Content-Range', contentRange);
      res.setHeader('Content-Length', contentLength);
    } else {
      res.setHeader('Content-Length', contentLength);
    }

    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Stream error' });
      else res.destroy();
    });
  } catch (error) {
    next(error);
  }
};

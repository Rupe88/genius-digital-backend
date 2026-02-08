import express from 'express';
import { optionalAuthenticate } from '../middleware/auth.js';
import {
  getVideoToken,
  streamLessonVideo,
  streamCoursePromo,
  streamImage,
} from '../controllers/mediaController.js';

const router = express.Router();

// Proxy S3 images (no auth) – fixes 403 when Next.js or browser loads private bucket images
router.get('/image', streamImage);

// Video URL: returns direct S3 signed URL (base https://s3-np1.datahub.com.np/...) or fallback stream URL. Promo public; lesson requires auth in handler.
router.get('/video-token', optionalAuthenticate, getVideoToken);

// Stream endpoints: token in query (no auth header so <video src> works)
router.get('/stream/lesson/:lessonId', streamLessonVideo);
router.get('/stream/course/:courseId/promo', streamCoursePromo);

export default router;

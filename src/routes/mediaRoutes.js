import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getVideoToken,
  streamLessonVideo,
  streamCoursePromo,
  streamImage,
} from '../controllers/mediaController.js';

const router = express.Router();

// Proxy S3 images (no auth) – fixes 403 when Next.js or browser loads private bucket images
router.get('/image', streamImage);

// Short-lived stream URL (auth required). Frontend calls this then sets video src to returned url.
router.get('/video-token', authenticate, getVideoToken);

// Stream endpoints: token in query (no auth header so <video src> works)
router.get('/stream/lesson/:lessonId', streamLessonVideo);
router.get('/stream/course/:courseId/promo', streamCoursePromo);

export default router;

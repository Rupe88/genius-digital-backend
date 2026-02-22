import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { useragentMiddleware } from './middleware/useragent.js';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
// Rate limiting disabled for now (was: generalLimiter)
// import { generalLimiter } from './middleware/enhancedRateLimit.js';

// Import all routes
import authRoutes from './routes/authRoutes.js';
import mobileAuthRoutes from './routes/mobileAuthRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import affiliateRoutes from './routes/affiliateRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import carouselRoutes from './routes/carouselRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import chapterRoutes from './routes/chapterRoutes.js';
import consultationRoutes from './routes/consultationRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import liveClassRoutes from './routes/liveClassRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentAnalyticsRoutes from './routes/paymentAnalyticsRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import popupRoutes from './routes/popupRoutes.js';
import productRoutes from './routes/productRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import studentSuccessRoutes from './routes/studentSuccessRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';

const app = express();

// Trust first proxy (for x-forwarded-proto / x-forwarded-host behind DigitalOcean, etc.)
app.set('trust proxy', 1);

// Security middleware – allow cross-origin so frontend (e.g. :3000) can load API media (e.g. :4000)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration – allow frontend and any *.vercel.app
const allowedOrigins = new Set([
  ...(config.corsOrigins || []),
  'https://vaastu-lms-dp.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]);
function isOriginAllowed(origin) {
  if (!origin) return true;
  if (config.nodeEnv === 'development') return true;
  if (allowedOrigins.has(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}
app.use(
    cors({
        origin: (origin, callback) => {
            if (isOriginAllowed(origin)) {
                return callback(null, true);
            }
            console.warn(`CORS blocked origin: ${origin}. Allowed:`, [...allowedOrigins]);
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    })
);

// Ensure CORS headers are on res for all responses (e.g. 413/500 from body parser or errors)
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// User agent middleware
app.use(useragentMiddleware);

// Rate limiting disabled for now
// app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// API base path - use empty string when deployed behind a proxy that strips /api (e.g. DigitalOcean)
const API_BASE = process.env.API_BASE_PATH !== undefined ? process.env.API_BASE_PATH : '/api';

// API routes (mounted at both /api/* and /* so they work with or without proxy path stripping)
const apiRoutes = [
  ['auth', authRoutes],
  ['mobile-auth', mobileAuthRoutes],
  ['admin', adminRoutes],
  ['affiliate', affiliateRoutes],
  ['assignment', assignmentRoutes],
  ['audit-log', auditLogRoutes],
  ['blog', blogRoutes],
  ['carousel', carouselRoutes],
  ['cart', cartRoutes],
  ['category', categoryRoutes],
  ['certificate', certificateRoutes],
  ['chapters', chapterRoutes],
  ['consultations', consultationRoutes],
  ['contact', contactRoutes],
  ['coupons', couponRoutes],
  ['courses', courseRoutes],
  ['enrollments', enrollmentRoutes],
  ['events', eventRoutes],
  ['faqs', faqRoutes],
  ['gallery', galleryRoutes],
  ['instructors', instructorRoutes],
  ['lessons', lessonRoutes],
  ['live-classes', liveClassRoutes],
  ['newsletters', newsletterRoutes],
  ['notifications', notificationRoutes],
  ['orders', orderRoutes],
  ['payment-analytics', paymentAnalyticsRoutes],
  ['payments', paymentRoutes],
  ['popups', popupRoutes],
  ['products', productRoutes],
  ['progress', progressRoutes],
  ['quizzes', quizRoutes],
  ['referrals', referralRoutes],
  ['reviews', reviewRoutes],
  ['student-success', studentSuccessRoutes],
  ['testimonials', testimonialRoutes],
  ['upload', uploadRoutes],
  ['media', mediaRoutes],
  ['wishlist', wishlistRoutes],
];
apiRoutes.forEach(([path, router]) => {
  app.use(`${API_BASE}/${path}`, router);
});
// When API_BASE is /api, also mount without prefix for proxies that strip /api (e.g. DigitalOcean)
if (API_BASE === '/api') {
  apiRoutes.forEach(([path, router]) => {
    app.use(`/${path}`, router);
  });
}
// When API_BASE is not /api (e.g. ""), also mount at /api so requests to /api/coupons/admin etc. still match
if (API_BASE !== '/api') {
  apiRoutes.forEach(([path, router]) => {
    app.use(`/api/${path}`, router);
  });
}

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import consultationRoutes from './routes/consultationRoutes.js';
import studentSuccessRoutes from './routes/studentSuccessRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import chapterRoutes from './routes/chapterRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import paymentAnalyticsRoutes from './routes/paymentAnalyticsRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import liveClassRoutes from './routes/liveClassRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import affiliateRoutes from './routes/affiliateRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { useragentMiddleware } from './middleware/useragent.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Support both web and mobile apps
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin only in development (mobile apps, Postman, etc.)
    if (!origin) {
      if (config.nodeEnv === 'development') {
        return callback(null, true);
      }
      // In production, reject requests without origin for security
      return callback(new Error('Origin required in production'));
    }

    // Check if origin is in allowed list
    if (config.corsOrigins.includes(origin) || config.nodeEnv === 'development') {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', config.corsOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// User agent parsing
app.use(useragentMiddleware);

// Cookie parser
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased from 100 to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'development' ? 100 : 20, // More lenient in development (100), 20 in production
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false, // Count failed attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  // Store in memory by default (resets on server restart)
  store: undefined, // Use default in-memory store
  // Allow bypassing in development if needed
  skip: (req) => {
    // In development, you can add a bypass header if needed
    if (config.nodeEnv === 'development' && req.headers['x-bypass-rate-limit'] === 'true') {
      return true;
    }
    return false;
  },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/resend-otp', authLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/student-success', studentSuccessRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/payment-analytics', paymentAnalyticsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/live-classes', liveClassRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/wishlist', wishlistRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;


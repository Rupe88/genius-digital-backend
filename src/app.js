import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { useragentMiddleware } from './middleware/useragent.js';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/enhancedRateLimit.js';

// Import all routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import affiliateRoutes from './routes/affiliateRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
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
import wishlistRoutes from './routes/wishlistRoutes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// User agent middleware
app.use(useragentMiddleware);

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/live-classes', liveClassRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment-analytics', paymentAnalyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/popups', popupRoutes);
app.use('/api/products', productRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/student-success', studentSuccessRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/wishlist', wishlistRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;

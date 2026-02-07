import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8000,
  jwtSecret: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'your-secret-key-change-in-production',
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRY || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || '7d',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // Frontend URL - Where to redirect after OAuth (e.g. Google login). Production: https://vaastu-lms-dp.vercel.app
  frontendUrl: (process.env.FRONTEND_URL?.trim() && process.env.FRONTEND_URL.trim() !== '') 
    ? process.env.FRONTEND_URL.trim()
    : (process.env.NODE_ENV === 'production' || (process.env.BACKEND_URL && process.env.BACKEND_URL.includes('ondigitalocean'))
      ? 'https://vaastu-lms-dp.vercel.app'
      : 'http://localhost:3000'),
  // Backend URL - used for OAuth redirect_uri (must match Google Cloud Console). No trailing slash.
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`,
  appName: process.env.APP_NAME || 'Sanskar Academy',

  // CORS - Multiple origins separated by commas
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://vaastu-lms-dp.vercel.app',
      'https://aacharyarajbabu.vercel.app',
      'https://vaastulms.vercel.app',
    ],

  // Email
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER,

  // Resend (fallback email service)
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL,

  // Upload size limits (MB). Set in .env to override. Video limit applies to course promo + lesson videos.
  upload: {
    imageMaxMb: Number(process.env.UPLOAD_IMAGE_MAX_MB) || 10,
    videoMaxMb: Number(process.env.UPLOAD_VIDEO_MAX_MB) || 3072, // 3GB default (videos over 1GB supported)
    documentMaxMb: Number(process.env.UPLOAD_DOCUMENT_MAX_MB) || 50,
    videoUploadTimeoutMs: Number(process.env.UPLOAD_VIDEO_TIMEOUT_MS) || 600000, // 10 min for S3 upload step
  },

  // S3-compatible storage (Kailesh Cloud / DataHub S3) - images, videos, documents
  s3: {
    endpoint: process.env.S3_ENDPOINT?.trim() || 'https://s3-np1.datahub.com.np',
    region: process.env.S3_REGION?.trim() || 'us-east-1',
    bucket: process.env.S3_BUCKET?.trim() || 'vaastu-lms',
    accessKey: process.env.S3_ACCESS_KEY?.trim() || null,
    secretKey: process.env.S3_SECRET_KEY?.trim() || null,
    // Public base URL for stored files (default: endpoint/bucket for path-style)
    publicUrl: process.env.S3_PUBLIC_URL?.trim() || null,
  },

  // Payment Gateways
  esewa: {
    merchantId: process.env.ESEWA_MERCHANT_ID || 'EPAYTEST',
    secretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
    environment: process.env.ESEWA_ENVIRONMENT || 'sandbox',
  },

  esewaProductCode: process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST',

  // Card Payments - Khalti (Recommended for Nepal - Supports Visa/Mastercard)
  khalti: {
    secretKey: process.env.KHALTI_SECRET_KEY,
    publicKey: process.env.KHALTI_PUBLIC_KEY,
  },

  // Card Payments - Razorpay (Alternative for Visa/Mastercard)
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  // Mobile Banking
  mobileBankingEnabled: process.env.MOBILE_BANKING_ENABLED === 'true',

  // Zoom Integration
  zoom: {
    accountId: process.env.ZOOM_ACCOUNT_ID,
    clientId: process.env.ZOOM_CLIENT_ID,
    clientSecret: process.env.ZOOM_CLIENT_SECRET,
    hostEmail: process.env.ZOOM_HOST_EMAIL,
  },

  // Sparrow SMS (Nepal) - optional; when set, OTP is also sent to phone during registration
  sparrowSms: {
    token: process.env.SPARROW_SMS_TOKEN?.trim() || null,
    from: process.env.SPARROW_SMS_FROM?.trim() || null, // Sender ID (NTA-approved), optional
  },

  // Google OAuth - optional; when set, "Login with Google" is enabled. Get credentials from Google Cloud Console.
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim() || null,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || null,
  },
};

import rateLimit from 'express-rate-limit';

/**
 * Enhanced rate limiting middleware with dynamic limits
 */

// Authentication rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment rate limiter (moderate)
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Allow more payment attempts
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin rate limiter (moderate - admins need more requests)
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for admin operations
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter (more lenient)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 100
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Very strict
  message: {
    success: false,
    message: 'Too many requests for this operation, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Per-IP limit for POST /auth/forgot-password (complements per-user OTP resend caps). */
export const forgotPasswordIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: 'Too many password reset requests from this network. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Per-IP limit for POST /auth/reset-password (mitigates distributed OTP guessing). */
export const passwordResetIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many password reset attempts from this network. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  authLimiter,
  paymentLimiter,
  adminLimiter,
  generalLimiter,
  strictLimiter,
  forgotPasswordIpLimiter,
  passwordResetIpLimiter,
};

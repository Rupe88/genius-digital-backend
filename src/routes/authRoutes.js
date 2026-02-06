import express from 'express';
import {
  register,
  verifyOtp,
  resendOtp,
  getOtpOptions,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
  googleRedirect,
  googleCallback,
} from '../controllers/authController.js';
import {
  getProfile,
  updateProfile,
  updatePaymentPreference,
  changePassword,
} from '../controllers/userController.js';
import {
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  resendOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  validate,
} from '../utils/validators.js';
import { authenticate } from '../middleware/auth.js';
import { body } from 'express-validator';

const router = express.Router();

// Public routes
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);
router.get('/otp-options', getOtpOptions);
router.post('/register', validate(registerValidation), register);
router.post('/verify-otp', validate(verifyOtpValidation), verifyOtp);
router.post('/resend-otp', validate(resendOtpValidation), resendOtp);
router.post('/login', validate(loginValidation), login);
router.post('/refresh-token', validate(refreshTokenValidation), refreshToken);
router.post('/forgot-password', validate(forgotPasswordValidation), forgotPassword);
router.post('/reset-password', validate(resetPasswordValidation), resetPassword);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// User profile routes
router.get('/profile', authenticate, getProfile);
router.put(
  '/profile',
  authenticate,
  validate([
    body('fullName').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Full name must be 1–255 characters'),
    body('phone').optional().trim().isLength({ max: 50 }).withMessage('Phone must be at most 50 characters'),
  ]),
  updateProfile
);
router.put(
  '/profile/payment-preference',
  authenticate,
  validate([
    body('preferredPaymentMethod')
      .isIn(['ESEWA', 'MOBILE_BANKING', 'VISA_CARD', 'MASTERCARD'])
      .withMessage('Invalid payment method'),
  ]),
  updatePaymentPreference
);
router.post(
  '/change-password',
  authenticate,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ]),
  changePassword
);

export default router;


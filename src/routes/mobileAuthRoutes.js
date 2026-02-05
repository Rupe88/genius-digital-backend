import express from 'express';
import {
  register,
  sendOtp,
  verifyOtp,
  login,
  refreshToken,
  getMe,
  logout,
} from '../controllers/mobileAuthController.js';
import {
  mobileRegisterValidation,
  mobileSendOtpValidation,
  mobileVerifyOtpValidation,
  mobileLoginValidation,
  mobileRefreshTokenValidation,
  validate,
} from '../utils/validators.js';
import { authenticateMobile } from '../middleware/auth.js';

const router = express.Router();

// Public
router.post('/register', validate(mobileRegisterValidation), register);
router.post('/send-otp', validate(mobileSendOtpValidation), sendOtp);
router.post('/verify-otp', validate(mobileVerifyOtpValidation), verifyOtp);
router.post('/login', validate(mobileLoginValidation), login);
router.post('/refresh-token', validate(mobileRefreshTokenValidation), refreshToken);

// Protected (Bearer token from mobile login)
router.get('/me', authenticateMobile, getMe);
router.post('/logout', authenticateMobile, logout);

export default router;

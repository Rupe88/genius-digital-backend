import express from 'express';
import {
  loginOrRegister,
  sendOtp,
  verifyOtp,
  getMe,
} from '../controllers/mobileAuthController.js';
import {
  mobileLoginOrRegisterValidation,
  mobileSendOtpValidation,
  mobileVerifyOtpValidation,
  validate,
} from '../utils/validators.js';
import { authenticateMobile } from '../middleware/auth.js';

const router = express.Router();

// Public
router.post('/login-or-register', validate(mobileLoginOrRegisterValidation), loginOrRegister);
router.post('/send-otp', validate(mobileSendOtpValidation), sendOtp);
router.post('/verify-otp', validate(mobileVerifyOtpValidation), verifyOtp);

// Protected (Bearer token from mobile login)
router.get('/me', authenticateMobile, getMe);

export default router;

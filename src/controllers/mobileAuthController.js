import { prisma } from '../config/database.js';
import { createOTP, verifyOTP, canResendOTP } from '../services/mobileOtpService.js';
import { sendOTPEmail } from '../services/emailService.js';
import { generateMobileToken } from '../services/tokenService.js';
import { OtpType } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';

// JWT payload for mobile uses mobileAppUserId (tokens are separate from main LMS)
const mobileTokenPayload = (user) => ({ mobileAppUserId: user.id });

/**
 * POST /api/mobile/auth/login-or-register
 * Unified endpoint: Register new user or login existing user.
 * If email exists, updates name/phone automatically and sends OTP.
 * If email is new, creates user and sends OTP.
 */
export const loginOrRegister = asyncHandler(async (req, res) => {
  const { email, fullName, phone } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.mobileAppUser.findUnique({
    where: { email: normalizedEmail },
  });

  let user;
  let isNewUser = false;

  if (existing) {
    // User exists - update name/phone if provided and different
    const updateData = {};
    if (fullName != null && String(fullName).trim() !== '' && existing.fullName !== String(fullName).trim()) {
      updateData.fullName = String(fullName).trim();
    }
    if (phone != null && String(phone).trim() !== '' && existing.phone !== String(phone).trim()) {
      updateData.phone = String(phone).trim();
    }

    if (Object.keys(updateData).length > 0) {
      user = await prisma.mobileAppUser.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      user = existing;
    }
  } else {
    // New user - create account
    isNewUser = true;
    user = await prisma.mobileAppUser.create({
      data: {
        email: normalizedEmail,
        fullName: fullName != null ? String(fullName).trim() : null,
        phone: phone != null && String(phone).trim() !== '' ? String(phone).trim() : null,
      },
    });
  }

  // Check rate limiting before sending OTP
  const canResend = await canResendOTP(user.id, OtpType.EMAIL_VERIFICATION);
  if (!canResend.canResend) {
    return res.status(429).json({
      success: false,
      message: canResend.message,
    });
  }

  // Send OTP
  const otp = await createOTP(user.id, OtpType.EMAIL_VERIFICATION);
  await sendOTPEmail(user.email, otp, 'verification');

  res.status(isNewUser ? 201 : 200).json({
    success: true,
    message: 'OTP sent to your email.',
    data: {
      mobileAppUserId: user.id,
      email: user.email,
      phone: user.phone ?? undefined,
    },
  });
});

/**
 * POST /api/mobile/auth/send-otp
 * Resend OTP to email for mobile app user (works for both verified and unverified users).
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.mobileAppUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const canResend = await canResendOTP(user.id, OtpType.EMAIL_VERIFICATION);
  if (!canResend.canResend) {
    return res.status(429).json({ success: false, message: canResend.message });
  }

  const otp = await createOTP(user.id, OtpType.EMAIL_VERIFICATION);
  await sendOTPEmail(user.email, otp, 'verification');

  res.json({
    success: true,
    message: 'OTP sent to your email.',
    data: { email: user.email },
  });
});

/**
 * POST /api/mobile/auth/verify-otp
 * Verify OTP and return non-expiring token.
 * Allows re-verification even if email is already verified.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await prisma.mobileAppUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const verification = await verifyOTP(user.id, otp, OtpType.EMAIL_VERIFICATION);
  if (!verification.valid) {
    return res.status(400).json({ success: false, message: verification.message });
  }

  // Mark email as verified if not already
  let updatedUser = user;
  if (!user.isEmailVerified) {
    updatedUser = await prisma.mobileAppUser.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });
  }

  // Generate non-expiring token
  const token = generateMobileToken(mobileTokenPayload(updatedUser));

  res.json({
    success: true,
    message: 'OTP verified successfully',
    data: {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        isEmailVerified: updatedUser.isEmailVerified,
      },
      token,
    },
  });
});

/**
 * GET /api/mobile/auth/me
 * Get current mobile app user (requires auth).
 */
export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.mobileAppUser },
  });
});

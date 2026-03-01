import { prisma } from '../config/database.js';
import { createOTP, verifyOTP, canResendOTP } from '../services/mobileOtpService.js';
import { sendOTPEmail, isEmailConfigured } from '../services/emailService.js';
import { sendOTPSms, isSmsConfigured } from '../services/smsService.js';
import { generateMobileToken } from '../services/tokenService.js';
import { OtpType } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';

// JWT payload for mobile uses mobileAppUserId (tokens are separate from main LMS)
const mobileTokenPayload = (user) => ({ mobileAppUserId: user.id });

/**
 * GET /api/mobile/auth/otp-status
 * Check if email and SMS OTP services are configured (for app UI / debugging).
 */
export const getOtpStatus = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      emailConfigured: isEmailConfigured(),
      smsConfigured: isSmsConfigured(),
    },
  });
});

/**
 * POST /api/mobile/auth/login-or-register
 * Unified endpoint: Register new user or login existing user.
 * If email exists, updates name/phone automatically and sends OTP.
 * If email is new, creates user and sends OTP.
 */
export const loginOrRegister = asyncHandler(async (req, res) => {
  const { email, fullName, phone, mailIn = 'email' } = req.body;
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

  // Check email is configured (required for email OTP or SMS fallback)
  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured. Please contact support.',
    });
  }

  // Send OTP based on mailIn
  const otp = await createOTP(user.id, OtpType.EMAIL_VERIFICATION);
  let sentVia = 'email';
  let message = 'OTP sent to your email.';

  if (mailIn === 'phone') {
    const userPhone = user.phone || phone;
    if (!userPhone || String(userPhone).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for SMS OTP',
      });
    }
    if (!isSmsConfigured()) {
      // SMS not configured - send via email instead
      try {
        await sendOTPEmail(user.email, otp, 'verification');
        message = 'SMS is not configured. OTP sent to your email instead.';
      } catch (err) {
        console.error('[Mobile Auth] Email send failed:', err.message);
        return res.status(503).json({
          success: false,
          message: 'Could not send OTP. Please try again or contact support.',
        });
      }
    } else {
      const smsResult = await sendOTPSms(userPhone, otp);
      if (!smsResult.success) {
        try {
          await sendOTPEmail(user.email, otp, 'verification');
          message = 'SMS failed. OTP sent to your email instead.';
        } catch (err) {
          console.error('[Mobile Auth] SMS and email fallback failed:', err.message);
          return res.status(503).json({
            success: false,
            message: 'Could not send OTP. Please try again later.',
          });
        }
      } else {
        sentVia = 'sms';
        message = 'OTP sent to your phone via SMS.';
      }
    }
  } else {
    try {
      await sendOTPEmail(user.email, otp, 'verification');
    } catch (err) {
      console.error('[Mobile Auth] Email send failed:', err.message);
      return res.status(503).json({
        success: false,
        message: 'Could not send OTP. Please try again or contact support.',
      });
    }
  }

  res.status(isNewUser ? 201 : 200).json({
    success: true,
    message,
    data: {
      mobileAppUserId: user.id,
      email: user.email,
      phone: user.phone ?? undefined,
      sentVia,
    },
  });
});

/**
 * POST /api/mobile/auth/send-otp
 * Resend OTP to email or phone for mobile app user (works for both verified and unverified users).
 * Supports mailIn: 'email' | 'phone' - defaults to email.
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { email, mailIn = 'email', phone } = req.body;
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

  if (!isEmailConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured. Please contact support.',
    });
  }

  const otp = await createOTP(user.id, OtpType.EMAIL_VERIFICATION);
  let sentVia = 'email';
  let message = 'OTP sent to your email.';

  if (mailIn === 'phone') {
    const userPhone = user.phone || phone;
    if (!userPhone || String(userPhone).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number required for SMS. Provide phone or ensure user has phone.',
      });
    }
    if (isSmsConfigured()) {
      const smsResult = await sendOTPSms(userPhone, otp);
      if (smsResult.success) {
        sentVia = 'sms';
        message = 'OTP sent to your phone via SMS.';
      }
    }
    if (sentVia === 'email') {
      try {
        await sendOTPEmail(user.email, otp, 'verification');
        message = isSmsConfigured() ? 'SMS failed. OTP sent to your email instead.' : 'OTP sent to your email.';
      } catch (err) {
        console.error('[Mobile Auth] Resend OTP email failed:', err.message);
        return res.status(503).json({
          success: false,
          message: 'Could not send OTP. Please try again.',
        });
      }
    }
  } else {
    try {
      await sendOTPEmail(user.email, otp, 'verification');
    } catch (err) {
      console.error('[Mobile Auth] Resend OTP email failed:', err.message);
      return res.status(503).json({
        success: false,
        message: 'Could not send OTP. Please try again.',
      });
    }
  }

  res.json({
    success: true,
    message,
    data: { email: user.email, phone: user.phone ?? undefined, sentVia },
  });
});

/**
 * POST /api/mobile/auth/verify-otp
 * Verify OTP and return non-expiring token.
 * Allows re-verification even if email is already verified.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp: otpRaw } = req.body;
  const otp = String(otpRaw ?? '').trim();
  const user = await prisma.mobileAppUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
    return res.status(400).json({ success: false, message: 'OTP must be exactly 6 digits' });
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

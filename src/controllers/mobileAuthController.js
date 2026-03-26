import { prisma } from '../config/database.js';
import { createOTP, verifyOTP, canResendOTP } from '../services/mobileOtpService.js';
import { sendOTPEmail, isEmailConfigured } from '../services/emailService.js';
import { sendOTPSms, isSmsConfigured } from '../services/smsService.js';
import { generateMobileToken } from '../services/tokenService.js';
import { OtpType } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';

// JWT payload for mobile uses mobileAppUserId (tokens are separate from main LMS)
const mobileTokenPayload = (user) => ({ mobileAppUserId: user.id });

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  // International: +977 + 10-digit = 13 digits total
  if (digits.startsWith('977') && digits.length === 13) return digits.slice(3);
  // Local 10-digit (96/97/98 prefixes) - keep as-is
  if (digits.length === 10) return digits;
  return null;
}

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
  const { phone, fullName, email, mailIn = 'phone' } = req.body;
  const normalizedPhone = normalizePhone(phone);
  const rawPhone = phone != null ? String(phone).trim() : null;
  if (!normalizedPhone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : null;

  const existing = await prisma.mobileAppUser.findUnique({
    where: { phone: normalizedPhone },
  });

  const existingFallback =
    !existing && rawPhone && rawPhone !== normalizedPhone
      ? await prisma.mobileAppUser.findUnique({ where: { phone: rawPhone } })
      : null;

  const existingUser = existing || existingFallback;

  let user;
  let isNewUser = false;

  if (existingUser) {
    // User exists - update name/email if provided
    const updateData = {};

    if (fullName != null && String(fullName).trim() !== '' && existingUser.fullName !== String(fullName).trim()) {
      updateData.fullName = String(fullName).trim();
    }

    if (normalizedEmail && (!existingUser.email || existingUser.email !== normalizedEmail)) {
      updateData.email = normalizedEmail;
    }

    if (Object.keys(updateData).length > 0) {
      user = await prisma.mobileAppUser.update({
        where: { id: existingUser.id },
        data: updateData,
      });
    } else {
      user = existingUser;
    }
  } else {
    // New user - create account
    isNewUser = true;
    user = await prisma.mobileAppUser.create({
      data: {
        phone: normalizedPhone,
        email: normalizedEmail,
        fullName: fullName != null ? String(fullName).trim() : null,
      },
    });
  }

  // Check rate limiting before sending OTP (phone verification)
  const canResend = await canResendOTP(user.id, OtpType.PHONE_VERIFICATION);
  if (!canResend.canResend) {
    return res.status(429).json({
      success: false,
      message: canResend.message,
    });
  }

  // Send OTP based on mailIn
  const otp = await createOTP(user.id, OtpType.PHONE_VERIFICATION);
  let sentVia = 'phone';
  let message = 'OTP sent successfully.';

  if (mailIn === 'email') {
    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to receive OTP via email.',
      });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured.',
      });
    }
    await sendOTPEmail(user.email, otp, 'verification');
    sentVia = 'email';
    message = 'OTP sent to your email.';
  } else {
    // Default: send via SMS to phone (fallback to email if SMS fails and email exists/configured)
    if (!isSmsConfigured()) {
      if (!isEmailConfigured() || !user.email) {
        return res.status(503).json({
          success: false,
          message: 'SMS is not configured and email is not available for fallback.',
        });
      }
      await sendOTPEmail(user.email, otp, 'verification');
      sentVia = 'email';
      message = 'OTP sent to your email instead (SMS not configured).';
    } else {
      const smsResult = await sendOTPSms(normalizedPhone, otp);
      if (smsResult.success) {
        sentVia = 'sms';
        message = 'OTP sent to your phone via SMS.';
      } else {
        if (!isEmailConfigured() || !user.email) {
          return res.status(503).json({
            success: false,
            message: 'SMS failed and email fallback is not available.',
          });
        }
        await sendOTPEmail(user.email, otp, 'verification');
        sentVia = 'email';
        message = 'SMS failed. OTP sent to your email instead.';
      }
    }
  }

  return res.status(isNewUser ? 201 : 200).json({
    success: true,
    message,
    data: {
      mobileAppUserId: user.id,
      email: user.email ?? undefined,
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
  const { phone, mailIn = 'phone', email } = req.body;
  const normalizedPhone = normalizePhone(phone);
  const rawPhone = phone != null ? String(phone).trim() : null;
  if (!normalizedPhone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : null;
  const user = await prisma.mobileAppUser.findUnique({
    where: { phone: normalizedPhone },
  });

  const userFallback =
    !user && rawPhone && rawPhone !== normalizedPhone
      ? await prisma.mobileAppUser.findUnique({ where: { phone: rawPhone } })
      : null;

  const mobileUser = user || userFallback;

  if (!mobileUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Optionally update email if client provides it
  if (normalizedEmail && (!mobileUser.email || mobileUser.email !== normalizedEmail)) {
    await prisma.mobileAppUser.update({
      where: { id: mobileUser.id },
      data: { email: normalizedEmail },
    });
  }

  const canResend = await canResendOTP(mobileUser.id, OtpType.PHONE_VERIFICATION);
  if (!canResend.canResend) {
    return res.status(429).json({ success: false, message: canResend.message });
  }

  const otp = await createOTP(mobileUser.id, OtpType.PHONE_VERIFICATION);
  let sentVia = 'phone';
  let message = 'OTP sent successfully.';

  if (mailIn === 'email') {
    if (!mobileUser.email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to receive OTP via email.',
      });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured.',
      });
    }
    await sendOTPEmail(mobileUser.email, otp, 'verification');
    sentVia = 'email';
    message = 'OTP sent to your email.';
  } else {
    // Default: send OTP via SMS to phone (fallback to email if SMS fails and email exists/configured)
    if (!isSmsConfigured()) {
      if (!isEmailConfigured() || !user.email) {
        return res.status(503).json({
          success: false,
          message: 'SMS is not configured and email fallback is not available.',
        });
      }
      await sendOTPEmail(mobileUser.email, otp, 'verification');
      sentVia = 'email';
      message = 'OTP sent to your email instead (SMS not configured).';
    } else {
      const smsResult = await sendOTPSms(normalizedPhone, otp);
      if (smsResult.success) {
        sentVia = 'sms';
        message = 'OTP sent to your phone via SMS.';
      } else {
        if (!isEmailConfigured() || !mobileUser.email) {
          return res.status(503).json({
            success: false,
            message: 'SMS failed and email fallback is not available.',
          });
        }
        await sendOTPEmail(mobileUser.email, otp, 'verification');
        sentVia = 'email';
        message = 'SMS failed. OTP sent to your email instead.';
      }
    }
  }

  res.json({
    success: true,
    message,
    data: { email: mobileUser.email ?? undefined, phone: mobileUser.phone ?? undefined, sentVia },
  });
});

/**
 * POST /api/mobile/auth/verify-otp
 * Verify OTP and return non-expiring token.
 * Allows re-verification even if email is already verified.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp: otpRaw } = req.body;
  const normalizedPhone = normalizePhone(phone);
  const rawPhone = phone != null ? String(phone).trim() : null;
  if (!normalizedPhone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }
  const otp = String(otpRaw ?? '').trim();
  const user = await prisma.mobileAppUser.findUnique({
    where: { phone: normalizedPhone },
  });

  const userFallback =
    !user && rawPhone && rawPhone !== normalizedPhone
      ? await prisma.mobileAppUser.findUnique({ where: { phone: rawPhone } })
      : null;

  const mobileUser = user || userFallback;

  if (!mobileUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
    return res.status(400).json({ success: false, message: 'OTP must be exactly 6 digits' });
  }
  const verification = await verifyOTP(mobileUser.id, otp, OtpType.PHONE_VERIFICATION);
  if (!verification.valid) {
    return res.status(400).json({ success: false, message: verification.message });
  }

  // Mark email as verified if not already
  let updatedUser = mobileUser;
  if (!mobileUser.isEmailVerified) {
    updatedUser = await prisma.mobileAppUser.update({
      where: { id: mobileUser.id },
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
        email: updatedUser.email ?? undefined,
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

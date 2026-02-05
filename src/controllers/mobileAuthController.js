import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import { createOTP, verifyOTP, canResendOTP } from '../services/mobileOtpService.js';
import { sendOTPEmail } from '../services/emailService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshTokenMobile,
  removeRefreshTokenMobile,
  verifyRefreshTokenInDBMobile,
  verifyRefreshToken,
} from '../services/tokenService.js';
import { OtpType } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';

// JWT payload for mobile uses mobileAppUserId (tokens are separate from main LMS)
const mobileAccessPayload = (user) => ({ mobileAppUserId: user.id });
const mobileRefreshPayload = (user) => ({ mobileAppUserId: user.id });

/**
 * POST /api/mobile/auth/register
 * Create mobile app user and send OTP to email.
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone } = req.body;

  const existing = await prisma.mobileAppUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    if (!existing.isEmailVerified) {
      const canResend = await canResendOTP(existing.id, OtpType.EMAIL_VERIFICATION);
      if (canResend.canResend) {
        const otp = await createOTP(existing.id, OtpType.EMAIL_VERIFICATION);
        await sendOTPEmail(existing.email, otp, 'verification');
      }
      return res.status(200).json({
        success: true,
        message: canResend.canResend
          ? 'Account exists but not verified. OTP sent to your email.'
          : canResend.message,
        data: { mobileAppUserId: existing.id, email: existing.email },
      });
    }
    return res.status(409).json({
      success: false,
      message: 'User with this email already exists',
    });
  }

  const hashedPassword = await hashPassword(password);
  const user = await prisma.mobileAppUser.create({
    data: {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName != null ? String(fullName).trim() : null,
      phone: phone != null && String(phone).trim() !== '' ? String(phone).trim() : null,
    },
  });

  const otp = await createOTP(user.id, OtpType.EMAIL_VERIFICATION);
  await sendOTPEmail(user.email, otp, 'verification');

  res.status(201).json({
    success: true,
    message: 'Registration successful. Check your email for OTP verification.',
    data: {
      mobileAppUserId: user.id,
      email: user.email,
      phone: user.phone ?? undefined,
    },
  });
});

/**
 * POST /api/mobile/auth/send-otp
 * Resend OTP to email for unverified mobile app user.
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.mobileAppUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (user.isEmailVerified) {
    return res.status(400).json({ success: false, message: 'Email already verified' });
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
 * Verify OTP and return access + refresh tokens.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await prisma.mobileAppUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (user.isEmailVerified) {
    return res.status(400).json({ success: false, message: 'Email already verified' });
  }

  const verification = await verifyOTP(user.id, otp, OtpType.EMAIL_VERIFICATION);
  if (!verification.valid) {
    return res.status(400).json({ success: false, message: verification.message });
  }

  await prisma.mobileAppUser.update({
    where: { id: user.id },
    data: { isEmailVerified: true },
  });

  const updatedUser = await prisma.mobileAppUser.findUnique({
    where: { id: user.id },
  });

  const accessToken = generateAccessToken(mobileAccessPayload(updatedUser));
  const refreshToken = generateRefreshToken(mobileRefreshPayload(updatedUser));
  await saveRefreshTokenMobile(updatedUser.id, refreshToken);

  res.json({
    success: true,
    message: 'Email verified successfully',
    data: {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        isEmailVerified: updatedUser.isEmailVerified,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * POST /api/mobile/auth/login
 * Login with email + password (email must be verified).
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.mobileAppUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  if (!user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email first. Use send-otp and verify-otp.',
    });
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const accessToken = generateAccessToken(mobileAccessPayload(user));
  const refreshToken = generateRefreshToken(mobileRefreshPayload(user));
  await saveRefreshTokenMobile(user.id, refreshToken);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * POST /api/mobile/auth/refresh-token
 * Issue new access (and refresh) token using refresh token.
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Refresh token is required' });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (e) {
    return res.status(401).json({ success: false, message: e.message || 'Invalid refresh token' });
  }

  const mobileAppUserId = decoded.mobileAppUserId;
  if (!mobileAppUserId) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }

  const isValid = await verifyRefreshTokenInDBMobile(mobileAppUserId, token);
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }

  const user = await prisma.mobileAppUser.findUnique({
    where: { id: mobileAppUserId },
  });
  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  const accessToken = generateAccessToken(mobileAccessPayload(user));
  const newRefreshToken = generateRefreshToken(mobileRefreshPayload(user));
  await saveRefreshTokenMobile(user.id, newRefreshToken);

  res.json({
    success: true,
    data: { accessToken, refreshToken: newRefreshToken },
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

/**
 * POST /api/mobile/auth/logout
 * Invalidate refresh token for mobile app user (requires auth).
 */
export const logout = asyncHandler(async (req, res) => {
  const mobileAppUserId = req.mobileAppUser?.id;
  if (mobileAppUserId) {
    await removeRefreshTokenMobile(mobileAppUserId);
  }
  res.json({ success: true, message: 'Logout successful' });
});

import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import { createOTP, verifyOTP, canResendOTP } from '../services/otpService.js';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService.js';
import { sendOTPSms, isSmsConfigured } from '../services/smsService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  removeRefreshToken,
  verifyRefreshTokenInDB,
  verifyRefreshToken,
} from '../services/tokenService.js';
import { OtpType } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';
import { config } from '../config/env.js';
import crypto from 'crypto';

export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // If user exists but email is not verified yet, resend OTP instead of blocking
    if (!existingUser.isEmailVerified) {
      // Respect OTP resend limits
      const canResend = await canResendOTP(existingUser.id, OtpType.EMAIL_VERIFICATION);

      if (canResend.canResend) {
        const otp = await createOTP(existingUser.id, OtpType.EMAIL_VERIFICATION);
        await sendOTPEmail(email, otp, 'verification');
        if (existingUser.phone && isSmsConfigured()) {
          await sendOTPSms(existingUser.phone, otp);
        }
      }

      return res.status(200).json({
        success: true,
        message:
          canResend.canResend
            ? 'An account with this email already exists but is not verified. A new OTP has been sent to your email.'
            : canResend.message,
        data: {
          userId: existingUser.id,
          email: existingUser.email,
          phone: existingUser.phone ?? undefined,
        },
      });
    }

    // Fully registered and verified account already exists
    return res.status(409).json({
      success: false,
      message: 'User with this email already exists',
    });
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user (phone is optional)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName,
      ...(phone != null && phone !== '' && { phone: String(phone).trim() }),
    },
  });

  // Generate and send OTP to email and optionally to phone (Sparrow SMS)
  const otp = await createOTP(user.id, OtpType.EMAIL_VERIFICATION);
  await sendOTPEmail(email, otp, 'verification');
  if (user.phone && isSmsConfigured()) {
    await sendOTPSms(user.phone, otp);
  }

  const message =
    user.phone && isSmsConfigured()
      ? 'Registration successful. Please check your email and phone for OTP verification.'
      : 'Registration successful. Please check your email for OTP verification.';

  res.status(201).json({
    success: true,
    message,
    data: {
      userId: user.id,
      email: user.email,
      phone: user.phone ?? undefined,
    },
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: 'Email already verified',
    });
  }

  const verification = await verifyOTP(user.id, otp, OtpType.EMAIL_VERIFICATION);

  if (!verification.valid) {
    return res.status(400).json({
      success: false,
      message: verification.message,
    });
  }

  // Update user as verified
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true },
  });

  // Generate tokens (same as login)
  const accessToken = generateAccessToken({ userId: updatedUser.id, role: updatedUser.role });
  const refreshToken = generateRefreshToken({ userId: updatedUser.id });

  // Save refresh token
  await saveRefreshToken(updatedUser.id, refreshToken);

  // Send welcome email
  try {
    await sendWelcomeEmail(email, updatedUser.fullName);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }

  res.json({
    success: true,
    message: 'Email verified successfully',
    data: {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
      },
      accessToken,
      refreshToken,
    },
  });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: 'Email already verified',
    });
  }

  // Check if can resend
  const canResend = await canResendOTP(user.id, OtpType.EMAIL_VERIFICATION);
  if (!canResend.canResend) {
    return res.status(429).json({
      success: false,
      message: canResend.message,
    });
  }

  // Generate and send new OTP (email + SMS if phone and Sparrow configured)
  const otp = await createOTP(user.id, OtpType.EMAIL_VERIFICATION);
  await sendOTPEmail(email, otp, 'verification');
  if (user.phone && isSmsConfigured()) {
    await sendOTPSms(user.phone, otp);
  }

  const resendMessage =
    user.phone && isSmsConfigured()
      ? 'OTP resent successfully. Please check your email and phone.'
      : 'OTP resent successfully. Please check your email.';

  res.json({
    success: true,
    message: resendMessage,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before logging in',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been blocked. Please contact support.',
    });
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id });

  // Save refresh token
  await saveRefreshToken(user.id, refreshToken);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
      refreshToken,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await removeRefreshToken(userId);

  res.json({
    success: true,
    message: 'Logout successful',
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required',
    });
  }

  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid refresh token',
    });
  }

  // Verify token in database
  const isValid = await verifyRefreshTokenInDB(decoded.userId, refreshToken);
  if (!isValid) {
    console.error('Refresh token not found or mismatched in DB for user:', decoded.userId);
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }

  // Find user and check status
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'User not found or inactive',
    });
  }

  // Generate new tokens (Always rotate for a sliding window)
  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = generateRefreshToken({ userId: user.id });

  // Save the new refresh token
  await saveRefreshToken(user.id, newRefreshToken);

  console.log(`Token rotated for user: ${user.id}`);

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists for security
    return res.json({
      success: true,
      message: 'If the email exists, a password reset OTP has been sent.',
    });
  }

  // Check if can resend
  const canResend = await canResendOTP(user.id, OtpType.PASSWORD_RESET);
  if (!canResend.canResend) {
    return res.status(429).json({
      success: false,
      message: canResend.message,
    });
  }

  // Generate and send OTP
  const otp = await createOTP(user.id, OtpType.PASSWORD_RESET);
  await sendOTPEmail(email, otp, 'password_reset');

  res.json({
    success: true,
    message: 'If the email exists, a password reset OTP has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const verification = await verifyOTP(user.id, otp, OtpType.PASSWORD_RESET);

  if (!verification.valid) {
    return res.status(400).json({
      success: false,
      message: verification.message,
    });
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  // Invalidate all refresh tokens
  await removeRefreshToken(user.id);

  res.json({
    success: true,
    message: 'Password reset successful. Please login with your new password.',
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

// --- Google OAuth (optional; enabled when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set)

const isGoogleAuthConfigured = () =>
  Boolean(config.google?.clientId && config.google?.clientSecret);

/** Build Google OAuth callback URL from request so it matches behind proxies. */
function getGoogleCallbackUrl(req) {
  const protocol = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  if (!protocol || !host) {
    return `${config.backendUrl}/api/auth/google/callback`;
  }
  const pathOnly = (req.originalUrl || req.url || '').split('?')[0] || '';
  if (pathOnly.includes('/callback')) {
    return `${protocol}://${host}${pathOnly}`;
  }
  const base = pathOnly.startsWith('/api') ? '/api' : '';
  return `${protocol}://${host}${base}/auth/google/callback`;
}

export const googleRedirect = asyncHandler((req, res) => {
  if (!isGoogleAuthConfigured()) {
    const redirectUrl = new URL(config.frontendUrl + '/login');
    redirectUrl.searchParams.set('error', encodeURIComponent('Google login is not configured'));
    return res.redirect(302, redirectUrl.toString());
  }
  const redirectUri = getGoogleCallbackUrl(req);
  const scope = 'openid email profile';
  const state = req.query.state ? String(req.query.state) : '';
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(302, url);
});

export const googleCallback = asyncHandler(async (req, res) => {
  const redirectToLogin = (error) => {
    const url = new URL(config.frontendUrl + '/login');
    if (error) url.searchParams.set('error', encodeURIComponent(error));
    res.redirect(302, url.toString());
  };

  if (!isGoogleAuthConfigured()) {
    return redirectToLogin('Google login is not configured');
  }

  const { code, state, error: googleError } = req.query;

  if (googleError) {
    const message = req.query.error_description
      ? `${req.query.error}: ${req.query.error_description}`
      : (req.query.error === 'access_denied' ? 'Sign-in was cancelled' : String(googleError));
    return redirectToLogin(message);
  }

  if (!code || typeof code !== 'string') {
    return redirectToLogin('Missing authorization code');
  }

  const redirectUri = getGoogleCallbackUrl(req);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    console.error('Google token exchange failed:', tokenRes.status, tokenText);
    return redirectToLogin('Google sign-in failed. Check redirect URI in Google Console.');
  }

  let tokenData;
  try {
    tokenData = JSON.parse(tokenText);
  } catch {
    return redirectToLogin('Google sign-in failed');
  }

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return redirectToLogin('Google sign-in failed');
  }

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoRes.ok) {
    console.error('Google userinfo failed:', userInfoRes.status);
    return redirectToLogin('Google sign-in failed');
  }
  const profile = await userInfoRes.json();
  const email = profile.email?.trim?.() || profile.email;
  const name = profile.name;
  const picture = profile.picture;

  if (!email) {
    return redirectToLogin('Google account has no email');
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await hashPassword(randomPassword);
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: name || email.split('@')[0],
        profileImage: picture || null,
        isEmailVerified: true,
      },
    });
  } else {
    if (!user.isActive) {
      return redirectToLogin('Your account has been blocked.');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name && user.fullName !== name && { fullName: name }),
        ...(picture && user.profileImage !== picture && { profileImage: picture }),
      },
    });
    user = await prisma.user.findUnique({ where: { id: user.id } });
  }

  const accessTokenJwt = generateAccessToken({ userId: user.id, role: user.role });
  const refreshTokenJwt = generateRefreshToken({ userId: user.id });
  await saveRefreshToken(user.id, refreshTokenJwt);

  const frontendUrl = new URL(config.frontendUrl + '/login');
  frontendUrl.searchParams.set('accessToken', accessTokenJwt);
  frontendUrl.searchParams.set('refreshToken', refreshTokenJwt);
  if (state) frontendUrl.searchParams.set('state', state);
  res.redirect(302, frontendUrl.toString());
});


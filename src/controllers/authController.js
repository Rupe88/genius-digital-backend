import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import {
  createOTP,
  verifyOTP,
  canResendOTP,
  isOtpVerifyBlocked,
  recordOtpVerifyFailure,
  clearOtpVerifyFailures,
} from '../services/otpService.js';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService.js';
import { sendOTPSms, isSmsConfigured } from '../services/smsService.js';
import { isEmailConfigured } from '../services/emailService.js';
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

/** Public: return whether email/SMS OTP services are configured */
export const getOtpOptions = asyncHandler((req, res) => {
  res.json({
    success: true,
    data: {
      smsAvailable: isSmsConfigured(),
      emailConfigured: isEmailConfigured(),
    },
  });
});

/** Normalize phone to 10-digit Nepal format for storage/SMS. Supports 96, 97, 98 prefixes. */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  // 10-digit local: 96/97/98 XXXXXXXX (Nepal mobile prefixes)
  if (digits.length === 10 && ['96', '97', '98'].includes(digits.slice(0, 2))) return digits;
  // International: +977 + 10-digit = 13 digits
  if (digits.startsWith('977') && digits.length === 13) return digits.slice(3);
  return null;
}

/** Send OTP to the chosen channel(s). Returns { sentEmail, sentSms }. Does not throw on SMS failure; falls back to email when SMS is chosen but fails. */
async function sendOtpByChannel(otp, { email, phone, otpChannel }) {
  const channel = otpChannel || 'email';
  let sentEmail = false;
  let sentSms = false;

  if (channel === 'email' || channel === 'both') {
    await sendOTPEmail(email, otp, 'verification');
    sentEmail = true;
  }

  if (channel === 'sms' || channel === 'both') {
    if (!isSmsConfigured()) {
      if (channel === 'sms') {
        throw new Error('SMS verification is not available right now. Please choose Email to receive OTP.');
      }
    } else {
      const to = normalizePhone(phone);
      if (to) {
        const result = await sendOTPSms(phone, otp);
        sentSms = result.success;
        if (!result.success) {
          console.warn('[Auth] SMS OTP failed:', result.message);
          if (channel === 'sms') {
            throw new Error('Could not send SMS OTP. Please choose Email to receive OTP.');
          }
        }
      } else if (channel === 'sms') {
        throw new Error('Valid phone number is required for SMS OTP.');
      }
    }
  }

  if (!sentEmail && !sentSms) {
    throw new Error('Could not send verification code. Please try again or use Email only.');
  }

  return { sentEmail, sentSms };
}

export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, otpChannel = 'email' } = req.body;

  // Validate SMS choice when SMS not configured
  if ((otpChannel === 'sms' || otpChannel === 'both') && !isSmsConfigured()) {
    return res.status(400).json({
      success: false,
      message: 'SMS verification is not available at the moment. Please choose Email to receive OTP.',
    });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // If user exists but email is not verified yet, resend OTP instead of blocking
    if (!existingUser.isEmailVerified) {
      const canResend = await canResendOTP(existingUser.id, OtpType.EMAIL_VERIFICATION);

      if (canResend.canResend) {
        const otp = await createOTP(existingUser.id, OtpType.EMAIL_VERIFICATION);
        const useChannel = otpChannel || (existingUser.phone && isSmsConfigured() ? 'both' : 'email');
        try {
          await sendOtpByChannel(otp, {
            email: existingUser.email,
            phone: existingUser.phone,
            otpChannel: useChannel,
          });
        } catch (err) {
          console.error('[Auth] Resend OTP failed:', err.message);
          return res.status(503).json({
            success: false,
            message: err.message || 'Could not send verification code. Please try again or contact support.',
          });
        }
      }

      const msg = canResend.canResend
        ? (otpChannel === 'sms' ? 'A new OTP has been sent to your phone.'
          : otpChannel === 'both' ? 'A new OTP has been sent to your email and phone.'
          : 'A new OTP has been sent to your email.')
        : canResend.message;

      return res.status(200).json({
        success: true,
        message: msg,
        data: {
          userId: existingUser.id,
          email: existingUser.email,
          phone: existingUser.phone ?? undefined,
        },
      });
    }

    return res.status(409).json({
      success: false,
      message: 'User with this email already exists',
    });
  }

  const hashedPassword = await hashPassword(password);
  const phoneNormalized = phone != null && phone !== '' ? normalizePhone(String(phone).trim()) || String(phone).trim() : null;

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName,
      ...(phoneNormalized && { phone: phoneNormalized }),
    },
  });

  const otp = await createOTP(user.id, OtpType.EMAIL_VERIFICATION);
  let sentEmail = false;
  let sentSms = false;
  try {
    const result = await sendOtpByChannel(otp, {
      email,
      phone: user.phone,
      otpChannel,
    });
    sentEmail = result.sentEmail;
    sentSms = result.sentSms;
  } catch (err) {
    console.error('[Auth] Send OTP failed:', err.message);
    return res.status(503).json({
      success: false,
      message: err.message || 'Could not send verification code. Please try again or contact support.',
    });
  }

  let message = 'Registration successful. ';
  if (sentEmail && sentSms) message += 'Please check your email and phone for the verification code.';
  else if (sentSms) message += 'Please check your phone for the verification code.';
  else if (sentEmail) message += (otpChannel === 'sms' || otpChannel === 'both' ? 'Please check your email for the verification code (SMS is currently unavailable).' : 'Please check your email for the verification code.');
  else message += 'Please check your email for the verification code.';

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

  let otpChannel = req.body?.otpChannel || (user.phone && isSmsConfigured() ? 'both' : 'email');
  if ((otpChannel === 'sms' || otpChannel === 'both') && (!user.phone || !isSmsConfigured())) {
    otpChannel = 'email';
  }
  const otp = await createOTP(user.id, OtpType.EMAIL_VERIFICATION);
  const { sentEmail, sentSms } = await sendOtpByChannel(otp, {
    email: user.email,
    phone: user.phone,
    otpChannel,
  });

  let resendMessage = 'OTP resent. ';
  if (sentEmail && sentSms) resendMessage += 'Check your email and phone.';
  else if (sentSms) resendMessage += 'Check your phone.';
  else resendMessage += 'Check your email.';

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
  // New code issued — reset failed-guess counter so user has a full attempt budget.
  await clearOtpVerifyFailures(user.id, OtpType.PASSWORD_RESET);

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

  if (await isOtpVerifyBlocked(user.id, OtpType.PASSWORD_RESET)) {
    return res.status(429).json({
      success: false,
      message:
        'Too many incorrect verification attempts. Please wait before trying again, or request a new password reset code.',
    });
  }

  const verification = await verifyOTP(user.id, otp, OtpType.PASSWORD_RESET);

  if (!verification.valid) {
    await recordOtpVerifyFailure(user.id, OtpType.PASSWORD_RESET);
    return res.status(400).json({
      success: false,
      message: verification.message,
    });
  }

  await clearOtpVerifyFailures(user.id, OtpType.PASSWORD_RESET);

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

/** Detect frontend URL from request headers (Origin/Referer) or use config fallback. */
function getFrontendUrl(req) {
  // Check if we're on production backend - if so, use production frontend
  const backendHost = req.get('x-forwarded-host') || req.get('host') || '';
  if (backendHost.includes('ondigitalocean.app') || backendHost.includes('goldfish-app') || backendHost.includes('stingray-app')) {
    return config.frontendUrl || 'https://sanskarvaastu.vercel.app';
  }

  // Check Origin header (set by browser when frontend makes request)
  const origin = req.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Only use if it's a known production domain or matches CORS origins
      const allowedDomains = [
        'sanskarvastu.com',
        'sanskarvaastu.vercel.app',
        'vaastu-lms-dp.vercel.app',
        'vaastulms.vercel.app',
        'aacharyarajbabu.vercel.app',
        'localhost',
        'localhost:3000',
        'localhost:3001',
      ];
      const hostname = originUrl.hostname;
      if (allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return origin;
      }
    } catch (e) {
      // Invalid origin, continue to fallback
    }
  }

  // Check Referer header as fallback
  const referer = req.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const allowedDomains = [
        'sanskarvastu.com',
        'sanskarvaastu.vercel.app',
        'vaastu-lms-dp.vercel.app',
        'vaastulms.vercel.app',
        'aacharyarajbabu.vercel.app',
        'localhost',
        'localhost:3000',
        'localhost:3001',
      ];
      const hostname = refererUrl.hostname;
      if (allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return `${refererUrl.protocol}//${refererUrl.host}`;
      }
    } catch (e) {
      // Invalid referer, continue to fallback
    }
  }

  // Fallback to config (which should be set correctly, but this is a safety net)
  // If config is still localhost but we're in production, override it
  if (process.env.NODE_ENV === 'production' || backendHost.includes('ondigitalocean')) {
    return config.frontendUrl || 'https://sanskarvaastu.vercel.app';
  }
  
  return config.frontendUrl;
}

// --- Helpers for safe URL building (avoid "Invalid URL" crashes)
function normalizeAbsoluteUrl(urlLike) {
  if (!urlLike || typeof urlLike !== 'string') return null;
  const raw = urlLike.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return `https://${raw}`;
  return raw;
}

function safeFrontendBase(req) {
  const derived = getFrontendUrl(req);
  return (
    normalizeAbsoluteUrl(derived) ||
    normalizeAbsoluteUrl(config.frontendUrl) ||
    'https://sanskarvaastu.vercel.app'
  );
}

function buildFrontendLoginUrl(req, error) {
  const base = safeFrontendBase(req);
  try {
    const url = new URL('/login', base);
    if (error) url.searchParams.set('error', error);
    return url.toString();
  } catch {
    const safeBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const qs = error ? `?error=${encodeURIComponent(error)}` : '';
    return `${safeBase}/login${qs}`;
  }
}

export const googleRedirect = asyncHandler((req, res) => {
  if (!isGoogleAuthConfigured()) {
    return res.redirect(302, buildFrontendLoginUrl(req, 'Google login is not configured'));
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
    res.redirect(302, buildFrontendLoginUrl(req, error));
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
  const googleId = profile.id != null ? String(profile.id) : null;
  const email = (profile.email && profile.email.trim) ? profile.email.trim() : (profile.email || '');
  const name = profile.name;
  const picture = profile.picture;

  if (!email) {
    return redirectToLogin('Google account has no email');
  }

  let user = null;
  try {
    if (googleId) {
      user = await prisma.user.findUnique({ where: { googleId } });
    }
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await hashPassword(randomPassword);
      const createData = {
        email,
        password: hashedPassword,
        fullName: name || email.split('@')[0],
        profileImage: picture || null,
        isEmailVerified: true,
      };
      if (googleId != null) createData.googleId = googleId;
      user = await prisma.user.create({ data: createData });
    } else {
      if (!user.isActive) {
        return redirectToLogin('Your account has been blocked.');
      }
      const updateData = {};
      if (googleId != null && (user.googleId == null || user.googleId === '')) updateData.googleId = googleId;
      if (name && user.fullName !== name) updateData.fullName = name;
      if (picture != null && user.profileImage !== picture) updateData.profileImage = picture;
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
        user = await prisma.user.findUnique({ where: { id: user.id } });
      }
    }
  } catch (err) {
    console.error('Google callback: user lookup/create failed', err?.message || err);
    return redirectToLogin('Account could not be created. Please try again or use email sign up.');
  }

  const accessTokenJwt = generateAccessToken({ userId: user.id, role: user.role });
  const refreshTokenJwt = generateRefreshToken({ userId: user.id });
  await saveRefreshToken(user.id, refreshTokenJwt);

  // Use hash fragment for tokens to avoid URL length limits and proxy stripping (hash is client-only)
  const hash = new URLSearchParams({
    accessToken: accessTokenJwt,
    refreshToken: refreshTokenJwt,
  }).toString();

  // Log callback URL so production can verify it matches Google Cloud Console redirect_uri
  const callbackUrl = getGoogleCallbackUrl(req);
  if (process.env.NODE_ENV === 'production') {
    console.log('Google OAuth: callback URL used for redirect_uri:', callbackUrl);
  }

  // Prefer frontend URL from state (so local dev redirects back to localhost, not production)
  const allowedFrontendHosts = [
    'localhost',
    '127.0.0.1',
    'sanskarvastu.com',
    'www.sanskarvastu.com',
    'vaastu-lms-dp.vercel.app',
    'vaastulms.vercel.app',
    'aacharyarajbabu.vercel.app',
    'sanskaracademy.net',
'www.sanskaracademy.net',
  ];
  let frontendBase = getFrontendUrl(req);
  if (state && typeof state === 'string') {
    try {
      const normalizedState = normalizeAbsoluteUrl(state);
      const stateUrl = normalizedState ? new URL(normalizedState) : null;
      if (!stateUrl) throw new Error('Invalid state URL');
      const scheme = stateUrl.protocol.replace(':', '');
      const host = stateUrl.hostname || '';
      const isAllowed =
        (scheme === 'http' || scheme === 'https') &&
        (allowedFrontendHosts.some((h) => host === h || host.endsWith('.' + h)));
      if (isAllowed) {
        frontendBase = stateUrl.origin;
      }
    } catch (_) {
      // ignore invalid state
    }
  }
  const base = normalizeAbsoluteUrl(frontendBase) || 'https://sanskarvaastu.vercel.app';
  const redirectTo = `${base.replace(/\/$/, '')}/oauth/callback#${hash}`;
  if (process.env.NODE_ENV === 'production') {
    console.log('Google OAuth: redirecting to frontend:', base, '(tokens in hash)');
  }
  res.redirect(302, redirectTo);
});


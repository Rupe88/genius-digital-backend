import { prisma } from '../config/database.js';
import { OtpType } from '@prisma/client';
import { config } from '../config/env.js';

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createOTP = async (mobileAppUserId, type) => {
  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  await prisma.mobileAppOtp.create({
    data: {
      mobileAppUserId,
      otp,
      type,
      expiresAt,
    },
  });

  return otp;
};

export const verifyOTP = async (mobileAppUserId, otp, type) => {
  const otpRecord = await prisma.mobileAppOtp.findFirst({
    where: {
      mobileAppUserId,
      otp,
      type,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    return { valid: false, message: 'Invalid or expired OTP' };
  }

  await prisma.mobileAppOtp.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  return { valid: true, otpRecord };
};

export const canResendOTP = async (mobileAppUserId, type) => {
  // Check if rate limiting is enabled (default: true for production, false for development)
  if (!config.enableOtpRateLimit) {
    return { canResend: true };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const otpCount = await prisma.mobileAppOtp.count({
    where: {
      mobileAppUserId,
      type,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (otpCount >= 3) {
    return { canResend: false, message: 'Maximum OTP requests reached. Please try again later.' };
  }
  return { canResend: true };
};

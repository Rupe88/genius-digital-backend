import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });
};

export const hashRefreshToken = async (token) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(token, salt);
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
};

export const saveRefreshToken = async (userId, refreshToken) => {
  try {
    const hashedToken = await hashRefreshToken(refreshToken);
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  } catch (error) {
    throw new Error('Failed to save refresh token');
  }
};

export const verifyRefreshTokenInDB = async (userId, refreshToken) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      return false;
    }

    return await bcrypt.compare(refreshToken, user.refreshToken);
  } catch (error) {
    return false;
  }
};

export const removeRefreshToken = async (userId) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  } catch (error) {
    throw new Error('Failed to remove refresh token');
  }
};

// Mobile app (Numerology app) - separate user table
export const saveRefreshTokenMobile = async (mobileAppUserId, refreshToken) => {
  const hashedToken = await hashRefreshToken(refreshToken);
  await prisma.mobileAppUser.update({
    where: { id: mobileAppUserId },
    data: { refreshToken: hashedToken },
  });
};

export const verifyRefreshTokenInDBMobile = async (mobileAppUserId, refreshToken) => {
  const user = await prisma.mobileAppUser.findUnique({
    where: { id: mobileAppUserId },
  });
  if (!user || !user.refreshToken) return false;
  return await bcrypt.compare(refreshToken, user.refreshToken);
};

export const removeRefreshTokenMobile = async (mobileAppUserId) => {
  await prisma.mobileAppUser.update({
    where: { id: mobileAppUserId },
    data: { refreshToken: null },
  });
};


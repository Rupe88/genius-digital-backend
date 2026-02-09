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

/** Mobile app token - non-expiring JWT for passwordless authentication */
export const generateMobileToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret); // No expiresIn option = non-expiring
};

export const verifyMobileToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new Error('Invalid mobile token');
  }
};

/** Short-lived token for secure video stream URL (no auth header needed on <video src>) */
const VIDEO_TOKEN_EXPIRY = process.env.VIDEO_STREAM_TOKEN_EXPIRY || '1h';

export const generateVideoStreamToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: VIDEO_TOKEN_EXPIRY });
};

export const verifyVideoStreamToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Video link expired');
    }
    throw new Error('Invalid video link');
  }
};

/** Short-lived token for image proxy (no S3 URL exposed to client). Payload: { type: 'courseThumbnail'|'lessonThumbnail', id: string } */
const IMAGE_TOKEN_EXPIRY = process.env.IMAGE_TOKEN_EXPIRY || '1h';

export const generateImageToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: IMAGE_TOKEN_EXPIRY });
};

export const verifyImageToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Image link expired');
    }
    throw new Error('Invalid image link');
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



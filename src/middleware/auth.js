import { verifyAccessToken, verifyMobileToken } from '../services/tokenService.js';
import { prisma } from '../config/database.js';
import { asyncHandler } from './errorHandler.js';

const applyInstructorDisplayRole = async (user) => {
  if (!user || user.role === 'ADMIN') return user;
  const normalizedEmail = (user.email || '').trim();
  if (!normalizedEmail) return user;
  const instructor = await prisma.instructor.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    select: { id: true },
  });
  return instructor ? { ...user, role: 'INSTRUCTOR' } : user;
};

export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyAccessToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact support.',
      });
    }

    req.user = await applyInstructorDisplayRole(user);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
    });
  }
});
export const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      req.user = await applyInstructorDisplayRole(user);
    }
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/** Mobile app (Numerology) auth: Bearer token must be from mobile login (payload has mobileAppUserId). Uses non-expiring token. */
export const authenticateMobile = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = verifyMobileToken(token);
    if (!decoded.mobileAppUserId) {
      return res.status(401).json({ success: false, message: 'Invalid token for mobile app' });
    }
    const user = await prisma.mobileAppUser.findUnique({
      where: { id: decoded.mobileAppUserId },
      select: { id: true, email: true, fullName: true, phone: true, isEmailVerified: true },
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.mobileAppUser = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid token',
    });
  }
});

import { asyncHandler } from './errorHandler.js';

export const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
});

export const requireInstructorOrAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'INSTRUCTOR') {
    return res.status(403).json({
      success: false,
      message: 'Instructor or admin access required',
    });
  }

  next();
});


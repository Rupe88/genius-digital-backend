import { config } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  const errName = err.name || '';
  const errMsg = typeof err.message === 'string' ? err.message : '';

  // S3 / S3-compatible storage (AWS SDK v3)
  if (
    errName === 'ServiceUnavailable' ||
    errMsg.includes('temporary failure of the server') ||
    errMsg.includes('ServiceUnavailable')
  ) {
    statusCode = 503;
    message =
      'File storage is temporarily unavailable. Retry shortly, or create the course without images/videos and add them from the edit page.';
  } else if (err.code === 'ECONNRESET' || errMsg.includes('socket hang up')) {
    statusCode = 503;
    message =
      'Upload to storage was interrupted. Try a smaller file, check your connection, or add media later from course edit.';
  } else if (errMsg.includes('S3 is not configured')) {
    statusCode = 503;
    message = 'File storage is not configured on the server.';
  }

  // Prisma errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A record with this information already exists';
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  const response = {
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  };

  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Ensure CORS headers on error responses (match common production frontends)
  const origin = req.get('origin');
  const corsOk =
    origin &&
    (config.nodeEnv === 'development' ||
      (Array.isArray(config.corsOrigins) && config.corsOrigins.includes(origin)) ||
      origin.endsWith('.vercel.app') ||
      origin === 'https://sanskaracademy.net' ||
      origin === 'https://www.sanskaracademy.net' ||
      origin === 'https://sanskarvastu.com' ||
      origin === 'https://www.sanskarvastu.com');
  if (corsOk) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req, res, next) => {
  const origin = req.get('origin');
  const corsOk =
    origin &&
    (config.nodeEnv === 'development' ||
      (Array.isArray(config.corsOrigins) && config.corsOrigins.includes(origin)) ||
      origin.endsWith('.vercel.app') ||
      origin === 'https://sanskaracademy.net' ||
      origin === 'https://www.sanskaracademy.net' ||
      origin === 'https://sanskarvastu.com' ||
      origin === 'https://www.sanskarvastu.com');
  if (corsOk) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


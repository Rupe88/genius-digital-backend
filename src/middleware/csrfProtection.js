import { config } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const EXTRA_ALLOWED_ORIGINS = [
  'https://vaastu-lms-dp.vercel.app',
  'https://sanskarvastu.com',
  'https://www.sanskarvastu.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

const getAllowedOrigins = () => {
  const configured = Array.isArray(config.corsOrigins) ? config.corsOrigins : [];
  return new Set([...configured, ...EXTRA_ALLOWED_ORIGINS]);
};

const originFromHeader = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * Lightweight CSRF protection:
 * - Only applies to unsafe methods.
 * - Only applies when request carries cookies (browser session context).
 * - Validates Origin/Referer against allowed origins.
 */
export const csrfOriginProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const hasCookies = req.cookies && Object.keys(req.cookies).length > 0;
  if (!hasCookies) return next();

  const allowedOrigins = getAllowedOrigins();
  const origin = originFromHeader(req.get('origin'));
  const refererOrigin = originFromHeader(req.get('referer'));
  const requestOrigin = origin || refererOrigin;

  // In development, keep this relaxed to reduce local friction.
  if (config.nodeEnv === 'development') return next();

  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    return res.status(403).json({
      success: false,
      message: 'Blocked by CSRF origin protection',
    });
  }

  return next();
};


import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  userId: string;
  role?: string;
  exp: number;
  iat: number;
}

/**
 * Decode JWT token without verification (frontend only)
 */
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  // Check if token expires within the next minute (buffer time)
  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const bufferTime = 60 * 1000; // 1 minute buffer

  return expirationTime < currentTime + bufferTime;
};

/**
 * Get time until token expires (in milliseconds)
 */
export const getTimeUntilExpiry = (token: string): number => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();

  return Math.max(0, expirationTime - currentTime);
};

/**
 * Check if token should be refreshed proactively
 * Returns true if token expires within the next 2 minutes
 */
export const shouldRefreshToken = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const refreshThreshold = 2 * 60 * 1000; // 2 minutes before expiry

  return expirationTime < currentTime + refreshThreshold;
};


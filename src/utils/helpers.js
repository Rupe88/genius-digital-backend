import { config } from '../config/env.js';

/**
 * Get public backend base URL from request (for stream/token URLs in production).
 * @param {import('express').Request} req
 * @returns {string}
 */
export function getBackendBaseUrl(req) {
  if (!req) return (config.backendUrl || '').replace(/\/$/, '');
  const proto = (req.get && req.get('x-forwarded-proto')) || (req.protocol || 'https');
  const host = (req.get && (req.get('x-forwarded-host') || req.get('host'))) || '';
  const parts = [proto, host].map((s) => (typeof s === 'string' ? s.split(',')[0].trim() : ''));
  if (!parts[1]) return (config.backendUrl || '').replace(/\/$/, '');
  if (parts[1].includes('localhost')) return (config.backendUrl || '').replace(/\/$/, '');
  return `${parts[0]}://${parts[1]}`.replace(/\/$/, '');
}

/**
 * Generate URL-friendly slug from a string
 * @param {string} text - Text to convert to slug
 * @returns {string} - Generated slug
 */
export const generateSlug = (text) => {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Generate unique slug by appending a number if slug already exists
 * @param {string} baseSlug - Base slug
 * @param {Function} checkExists - Async function that checks if slug exists
 * @returns {Promise<string>} - Unique slug
 */
export const generateUniqueSlug = async (baseSlug, checkExists) => {
  let slug = baseSlug;
  let counter = 1;

  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};


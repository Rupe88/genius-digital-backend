/**
 * S3-compatible storage service (Kailesh Cloud / DataHub S3).
 * Replaces Cloudinary for images, videos, and documents.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/env.js';
import crypto from 'crypto';

let s3Client = null;

function getS3Client() {
  if (!config.s3.accessKey || !config.s3.secretKey) {
    throw new Error('S3 is not configured. Set S3_ACCESS_KEY and S3_SECRET_KEY in .env');
  }
  if (!s3Client) {
    const endpoint = config.s3.endpoint.replace(/\/$/, '');
    s3Client = new S3Client({
      endpoint,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
      forcePathStyle: true,
    });
    console.log('✓ S3 storage configured:', endpoint, 'bucket:', config.s3.bucket);
  }
  return s3Client;
}

/** Base URL for our S3 bucket (path-style: endpoint/bucket) */
export function getS3BaseUrl() {
  return (config.s3.publicUrl || `${config.s3.endpoint.replace(/\/$/, '')}/${config.s3.bucket}`).replace(/\/$/, '');
}

/** Whether the URL is from our S3 bucket (used to decide stream vs direct URL) */
export function isOurS3Url(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
  const base = getS3BaseUrl();
  return url.startsWith(base + '/') || url.startsWith(base);
}

/** Extract S3 object key from a stored public URL or signed URL (our bucket only). Strips query string. */
export function getS3KeyFromStoredUrl(url) {
  if (!isOurS3Url(url)) return null;
  const base = getS3BaseUrl();
  const pathPart = url.split('?')[0];
  return pathPart.slice(base.length).replace(/^\//, '');
}

/**
 * Get public URL for an object key (path-style: endpoint/bucket/key)
 */
function getPublicUrl(key) {
  const base = getS3BaseUrl();
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  return `${base}/${cleanKey}`;
}

/**
 * Get a pre-signed GET URL for private bucket access (e.g. video playback).
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Seconds until URL expires (default 3600 = 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedGetUrl(key, expiresIn = 3600) {
  const client = getS3Client();
  const cmd = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key.startsWith('/') ? key.slice(1) : key,
  });
  return getSignedUrl(client, cmd, { expiresIn });
}

/**
 * If the URL is from our S3 bucket, return a signed URL so the client can fetch it (e.g. private bucket).
 * Otherwise return the original URL (e.g. YouTube).
 * @param {string} url - Stored URL (public S3 or external)
 * @param {number} expiresIn - Seconds for signed URL (default 3600)
 * @returns {Promise<string>}
 */
export async function getSignedUrlForMediaUrl(url, expiresIn = 3600) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return url;
  const base = getS3BaseUrl();
  if (!url.startsWith(base + '/') && !url.startsWith(base)) return url;
  try {
    const key = getS3KeyFromStoredUrl(url);
    if (!key) return url;
    return await getSignedGetUrl(key, expiresIn);
  } catch (err) {
    console.warn('[S3] Signed URL failed for', url, err.message);
    return url;
  }
}

/**
 * Get a readable stream from S3 for streaming (e.g. secure video). Supports Range for seeking.
 * @param {string} key - S3 object key
 * @param {string} [range] - Optional Range header value (e.g. "bytes=0-1023")
 * @returns {Promise<{ stream: Readable, contentLength: number, contentType: string, contentRange?: string }>}
 */
export async function getObjectStream(key, range = null) {
  const client = getS3Client();
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  const cmd = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: cleanKey,
    ...(range && { Range: range }),
  });
  const response = await client.send(cmd);
  return {
    stream: response.Body,
    contentLength: response.ContentLength ?? 0,
    contentType: response.ContentType || 'video/mp4',
    contentRange: response.ContentRange || undefined,
  };
}

/**
 * Get object content length (for building Content-Range when SDK does not return it).
 * @param {string} key - S3 object key
 * @returns {Promise<number>} Total byte length of the object
 */
export async function getObjectContentLength(key) {
  const client = getS3Client();
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  const cmd = new HeadObjectCommand({
    Bucket: config.s3.bucket,
    Key: cleanKey,
  });
  const response = await client.send(cmd);
  return response.ContentLength ?? 0;
}

/**
 * Generate unique key with folder and extension
 */
function generateKey(folder, buffer, mimeType, prefix = '') {
  const ext = mimeToExt(mimeType) || 'bin';
  const hash = crypto.randomBytes(8).toString('hex');
  const name = prefix ? `${prefix}-${hash}` : hash;
  const cleanFolder = (folder || 'lms').replace(/^\/|\/$/g, '');
  return `${cleanFolder}/${name}.${ext}`;
}

function mimeToExt(mimeType) {
  if (!mimeType) return null;
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
    'video/quicktime': 'mov',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
  };
  return map[mimeType] || map[mimeType.split(';')[0]] || null;
}

function getContentType(mimeType, key) {
  if (mimeType) return mimeType;
  const ext = key.split('.').pop()?.toLowerCase();
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf' };
  return map[ext] || 'application/octet-stream';
}

/**
 * Upload buffer to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 object key (path)
 * @param {string} contentType - MIME type
 * @returns {Promise<{ url: string, key: string }>}
 */
export async function uploadBuffer(buffer, key, contentType) {
  const client = getS3Client();
  const cmd = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || getContentType(null, key),
  });
  await client.send(cmd);
  const url = getPublicUrl(key);
  return { url, key };
}

/**
 * Upload image to S3 (compatible interface with former Cloudinary)
 * @param {Buffer|string} file - File buffer or path (path not supported in S3 service, use buffer)
 * @param {Object} options - { folder, mimeType }
 * @returns {Promise<{ secure_url, public_id, width?, height?, format? }>}
 */
export async function uploadImage(file, options = {}) {
  const buffer = Buffer.isBuffer(file) ? file : null;
  if (!buffer) throw new Error('S3 upload requires a buffer');
  const folder = options.folder || 'lms/images';
  const mimeType = options.mimeType || 'image/jpeg';
  const key = generateKey(folder, buffer, mimeType, 'img');
  const { url, key: keyOut } = await uploadBuffer(buffer, key, mimeType);
  return {
    secure_url: url,
    public_id: keyOut,
    format: mimeToExt(mimeType) || 'jpg',
  };
}

/**
 * Upload video to S3
 */
export async function uploadVideo(file, options = {}) {
  const buffer = Buffer.isBuffer(file) ? file : null;
  if (!buffer) throw new Error('S3 upload requires a buffer');
  const folder = options.folder || 'lms/videos';
  const mimeType = options.mimeType || 'video/mp4';
  const key = generateKey(folder, buffer, mimeType, 'vid');
  const { url, key: keyOut } = await uploadBuffer(buffer, key, mimeType);
  return {
    secure_url: url,
    public_id: keyOut,
    duration: undefined,
    format: mimeToExt(mimeType) || 'mp4',
  };
}

/**
 * Upload document to S3
 */
export async function uploadDocument(file, options = {}) {
  const buffer = Buffer.isBuffer(file) ? file : null;
  if (!buffer) throw new Error('S3 upload requires a buffer');
  const folder = options.folder || 'lms/documents';
  const mimeType = options.mimeType || 'application/octet-stream';
  const key = generateKey(folder, buffer, mimeType, 'doc');
  const { url, key: keyOut } = await uploadBuffer(buffer, key, mimeType);
  return {
    secure_url: url,
    public_id: keyOut,
  };
}

/**
 * Delete object from S3 (publicId = S3 key)
 */
export async function deleteFile(publicId, _resourceType = 'image') {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.s3.bucket,
      Key: publicId,
    })
  );
  return { result: 'ok' };
}

/**
 * Check if S3 is configured
 */
export function isS3Configured() {
  return Boolean(config.s3.accessKey && config.s3.secretKey && config.s3.bucket);
}

export default {
  uploadImage,
  uploadVideo,
  uploadDocument,
  deleteFile,
  getPublicUrl,
  getSignedGetUrl,
  getSignedUrlForMediaUrl,
  getObjectStream,
  isOurS3Url,
  getS3KeyFromStoredUrl,
  isS3Configured,
};

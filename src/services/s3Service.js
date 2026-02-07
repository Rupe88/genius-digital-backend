/**
 * S3-compatible storage service (Kailesh Cloud / DataHub S3).
 * Replaces Cloudinary for images, videos, and documents.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

/**
 * Get public URL for an object key (path-style: endpoint/bucket/key)
 */
function getPublicUrl(key) {
  const base = config.s3.publicUrl || `${config.s3.endpoint.replace(/\/$/, '')}/${config.s3.bucket}`;
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  return `${base}/${cleanKey}`;
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
  isS3Configured,
};

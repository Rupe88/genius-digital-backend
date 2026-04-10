/**
 * Supabase Storage — images (thumbnails), videos, and documents.
 * Server uses the service role key; never expose it to the client.
 */

import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';
import { config } from '../config/env.js';
import crypto from 'crypto';

let supabaseAdmin = null;
let bucketReadyPromise = null;

function getSupabase() {
  const { url, serviceRoleKey } = config.supabase;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    console.log('✓ Supabase storage configured, bucket:', config.supabase.storageBucket);
  }
  return supabaseAdmin;
}

async function ensureBucketReady() {
  if (bucketReadyPromise) return bucketReadyPromise;
  bucketReadyPromise = (async () => {
    const supabase = getSupabase();
    const bucket = config.supabase.storageBucket;
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      throw new Error(`Unable to list Supabase buckets: ${listError.message}`);
    }
    const exists = Array.isArray(buckets) && buckets.some((b) => b?.name === bucket);
    if (exists) return;
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 524288000,
    });
    if (createError && !String(createError.message || '').toLowerCase().includes('already exists')) {
      throw new Error(`Unable to create Supabase bucket "${bucket}": ${createError.message}`);
    }
    console.log(`✓ Supabase storage bucket ready: ${bucket}`);
  })().catch((err) => {
    bucketReadyPromise = null;
    throw err;
  });
  return bucketReadyPromise;
}

function encodePathSegments(path) {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return clean.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

/**
 * Convert stored media reference to absolute URL when possible.
 * Supports:
 * - full http(s) URLs (returned as-is)
 * - /storage/v1/object/public/<bucket>/... style paths
 * - raw storage object keys like "lms/images/file.jpg"
 */
export function resolveStorageUrl(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return urlOrPath;
  const raw = urlOrPath.trim();
  if (!raw) return raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  const base = config.supabase.url?.replace(/\/$/, '');
  const bucket = config.supabase.storageBucket;
  if (!base || !bucket) return raw;

  const publicPrefix = `/storage/v1/object/public/${bucket}/`;
  const authPrefix = `/storage/v1/object/authenticated/${bucket}/`;

  if (raw.startsWith(publicPrefix) || raw.startsWith(authPrefix)) {
    return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
  }
  if (raw.startsWith(`storage/v1/object/public/${bucket}/`) || raw.startsWith(`storage/v1/object/authenticated/${bucket}/`)) {
    return `${base}/${raw}`;
  }

  const normalizedKey = raw.startsWith(`${bucket}/`) ? raw.slice(bucket.length + 1) : raw.replace(/^\/+/, '');
  return `${getStorageBaseUrl()}/${encodePathSegments(normalizedKey)}`;
}

/** Public URL base used in stored links (public bucket). */
export function getStorageBaseUrl() {
  const base = config.supabase.url?.replace(/\/$/, '') || '';
  const bucket = config.supabase.storageBucket;
  return `${base}/storage/v1/object/public/${bucket}`;
}

/** @deprecated alias */
export const getS3BaseUrl = getStorageBaseUrl;

export function isOurStorageUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
  const supabaseUrl = config.supabase.url?.replace(/\/$/, '');
  if (!supabaseUrl) return false;
  const bucket = config.supabase.storageBucket;
  return (
    url.includes(`${supabaseUrl}/storage/v1/object/public/${bucket}/`) ||
    url.includes(`${supabaseUrl}/storage/v1/object/authenticated/${bucket}/`) ||
    url.includes(`/storage/v1/object/public/${bucket}/`)
  );
}

/** Kept name for existing controllers — only Supabase URLs are supported now. */
export const isOurS3Url = isOurStorageUrl;

export function getStoragePathFromStoredUrl(url) {
  if (!isOurStorageUrl(url)) return null;
  const pathPart = url.split('?')[0];
  const bucket = config.supabase.storageBucket;
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const authMarker = `/storage/v1/object/authenticated/${bucket}/`;
  let idx = pathPart.indexOf(publicMarker);
  let prefixLen = publicMarker.length;
  if (idx === -1) {
    idx = pathPart.indexOf(authMarker);
    prefixLen = authMarker.length;
  }
  if (idx === -1) return null;
  return decodeURIComponent(pathPart.slice(idx + prefixLen));
}

/** @deprecated alias */
export const getS3KeyFromStoredUrl = getStoragePathFromStoredUrl;

function authenticatedObjectUrl(path) {
  const base = config.supabase.url.replace(/\/$/, '');
  const bucket = config.supabase.storageBucket;
  const encoded = encodePathSegments(path);
  return `${base}/storage/v1/object/authenticated/${bucket}/${encoded}`;
}

function storageHeaders(extra = {}) {
  const key = config.supabase.serviceRoleKey;
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    ...extra,
  };
}

/**
 * Signed GET URL (works for private buckets; also fine for public).
 */
export async function getSignedGetUrl(path, expiresIn = 3600) {
  await ensureBucketReady();
  const supabase = getSupabase();
  const bucket = config.supabase.storageBucket;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(clean, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function getSignedUrlForMediaUrl(url, expiresIn = 3600) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return url;
  if (!isOurStorageUrl(url)) return url;
  try {
    const path = getStoragePathFromStoredUrl(url);
    if (!path) return url;
    return await getSignedGetUrl(path, expiresIn);
  } catch (err) {
    console.warn('[Storage] Signed URL failed for', url, err.message);
    return url;
  }
}

export async function getObjectStream(key, range = null) {
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  const url = authenticatedObjectUrl(cleanKey);
  const res = await fetch(url, {
    headers: storageHeaders(range ? { Range: range } : {}),
  });

  if (!res.ok) {
    const err = new Error(`Storage fetch failed: ${res.status}`);
    err.statusCode = res.status;
    if (res.status === 404) err.name = 'NoSuchKey';
    throw err;
  }

  const body = res.body;
  if (!body) {
    throw new Error('Empty response body from storage');
  }

  const nodeStream = Readable.fromWeb(body);
  const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const contentRange = res.headers.get('content-range') || undefined;

  return {
    stream: nodeStream,
    contentLength,
    contentType,
    contentRange,
  };
}

export async function getObjectContentLength(key) {
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  const url = authenticatedObjectUrl(cleanKey);
  const res = await fetch(url, { method: 'HEAD', headers: storageHeaders() });
  if (!res.ok) {
    const err = new Error(`Storage HEAD failed: ${res.status}`);
    err.name = res.status === 404 ? 'NoSuchKey' : 'StorageError';
    err.code = res.status === 404 ? '404' : String(res.status);
    throw err;
  }
  return parseInt(res.headers.get('content-length') || '0', 10);
}

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
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  };
  return map[mimeType] || map[mimeType.split(';')[0]] || null;
}

function getContentType(mimeType, key) {
  if (mimeType) return mimeType;
  const ext = key.split('.').pop()?.toLowerCase();
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    pdf: 'application/pdf',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return map[ext] || 'application/octet-stream';
}

export async function uploadBuffer(buffer, key, contentType) {
  await ensureBucketReady();
  const supabase = getSupabase();
  const bucket = config.supabase.storageBucket;
  const path = key.startsWith('/') ? key.slice(1) : key;
  const ct = contentType || getContentType(null, key);

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: ct,
    upsert: true,
  });
  if (error) throw new Error(error.message || 'Upload failed');

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, key: path };
}

/** Legacy name — object is already public-readable when bucket is public. */
export async function makeObjectPublic() {
  /* no-op: Supabase uses bucket policies instead of per-object ACL */
}

export async function uploadImage(file, options = {}) {
  const buffer = Buffer.isBuffer(file) ? file : null;
  if (!buffer) throw new Error('Storage upload requires a buffer');
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

export async function uploadVideo(file, options = {}) {
  const buffer = Buffer.isBuffer(file) ? file : null;
  if (!buffer) throw new Error('Storage upload requires a buffer');
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

export async function uploadDocument(file, options = {}) {
  const buffer = Buffer.isBuffer(file) ? file : null;
  if (!buffer) throw new Error('Storage upload requires a buffer');
  const folder = options.folder || 'lms/documents';
  const mimeType = options.mimeType || 'application/octet-stream';
  const key = generateKey(folder, buffer, mimeType, 'doc');
  const { url, key: keyOut } = await uploadBuffer(buffer, key, mimeType);
  return {
    secure_url: url,
    public_id: keyOut,
  };
}

export async function deleteFile(publicId) {
  await ensureBucketReady();
  const supabase = getSupabase();
  const bucket = config.supabase.storageBucket;
  const { error } = await supabase.storage.from(bucket).remove([publicId]);
  if (error) throw new Error(error.message);
  return { result: 'ok' };
}

export function isStorageConfigured() {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey && config.supabase.storageBucket);
}

/** @deprecated alias */
export const isS3Configured = isStorageConfigured;

export default {
  uploadImage,
  uploadVideo,
  uploadDocument,
  deleteFile,
  resolveStorageUrl,
  getSignedGetUrl,
  getSignedUrlForMediaUrl,
  getObjectStream,
  isOurStorageUrl,
  isOurS3Url,
  getStoragePathFromStoredUrl,
  getS3KeyFromStoredUrl,
  isStorageConfigured,
  isS3Configured,
};

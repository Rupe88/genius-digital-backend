import { validationResult } from 'express-validator';
import * as certificateService from '../services/certificateService.js';

/**
 * Get user's certificates
 */
export const getUserCertificates = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const certificates = await certificateService.getUserCertificates(userId);

    res.json({
      success: true,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all certificates (admin only)
 */
export const getAllCertificatesAdmin = async (req, res, next) => {
  try {
    const certificates = await certificateService.getAllCertificates();
    res.json({
      success: true,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Issue certificate for a user (admin only)
 */
export const issueCertificateForUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { userId, courseId } = req.body;
    // Admin override: create/reuse certificate without completion checks
    const certificate = await certificateService.ensureCertificateForAdmin(userId, courseId);
    res.status(201).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Issue certificate
 */
export const issueCertificate = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { courseId } = req.params;
    const userId = req.user.id;

    const certificate = await certificateService.issueCertificate(userId, courseId);

    res.status(201).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify certificate (Public)
 */
export const verifyCertificate = async (req, res, next) => {
  try {
    const { certificateId } = req.params;

    const certificate = await certificateService.verifyCertificate(certificateId);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid',
      });
    }

    res.json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check certificate eligibility
 */
export const checkEligibility = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const eligibility = await certificateService.checkCertificateEligibility(userId, courseId);

    res.json({
      success: true,
      data: eligibility,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: upload a certificate file for a specific user & course.
 * Expects multipart/form-data with:
 * - file: the certificate document (PDF/image)
 * - userId: UUID
 * - courseId: UUID
 *
 * The file is uploaded to S3 via cloudinaryUpload middleware and its URL
 * is available in req.cloudinary.url.
 */
export const uploadCertificateForUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { userId, courseId } = req.body;
    const fileUrl = req.cloudinary?.url;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Certificate file is required',
      });
    }

    // Admin override: ensure a certificate exists (create if needed) WITHOUT eligibility checks.
    const certificate = await certificateService.ensureCertificateForAdmin(userId, courseId);

    // Update the certificate URL to point to the uploaded document.
    const updatedCertificate = await certificateService.updateCertificateUrl(
      certificate.id,
      fileUrl
    );

    res.status(201).json({
      success: true,
      data: updatedCertificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Proxy a certificate template image (for PDF generation).
 * This avoids browser CORS restrictions when converting the template to a data URL.
 *
 * GET /certificate/template-proxy?url=https://...
 */
export const proxyCertificateTemplate = async (req, res, next) => {
  try {
    const rawUrl = String(req.query?.url || '');
    if (!rawUrl) {
      return res.status(400).json({ success: false, message: 'url query param is required' });
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid url' });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ success: false, message: 'Invalid url protocol' });
    }

    const upstream = await fetch(rawUrl, { redirect: 'follow' });
    if (!upstream.ok) {
      return res
        .status(502)
        .json({ success: false, message: `Failed to fetch template (${upstream.status})` });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const arrayBuffer = await upstream.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    next(error);
  }
};

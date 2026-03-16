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

    // Ensure a certificate exists (and user is eligible) – this will create one if needed.
    const certificate = await certificateService.issueCertificate(userId, courseId);

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

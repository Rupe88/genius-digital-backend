import { prisma } from '../config/database.js';

import crypto from 'crypto';


/**
 * Generate certificate ID
 */
export const generateCertificateId = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `CERT-${timestamp}-${random}`.toUpperCase();
};

/**
 * Check if user is eligible for certificate
 */
export const checkCertificateEligibility = async (userId, courseId) => {
  // Check enrollment and completion
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    include: {
      course: {
        include: {
          lessons: true,
        },
      },
    },
  });

  if (!enrollment || enrollment.status !== 'COMPLETED') {
    return {
      eligible: false,
      reason: 'Course not completed',
    };
  }

  // Check if all lessons are completed
  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      isCompleted: true,
      lesson: {
        courseId,
      },
    },
  });

  const totalLessons = enrollment.course.lessons.length;

  if (completedLessons < totalLessons) {
    return {
      eligible: false,
      reason: 'Not all lessons completed',
      completed: completedLessons,
      total: totalLessons,
    };
  }

  return {
    eligible: true,
  };
};

/**
 * Generate certificate URL (placeholder - in production, generate PDF and upload to Cloudinary)
 */
export const generateCertificateUrl = async (userId, courseId, certificateId) => {
  // TODO: Generate actual PDF certificate
  // For now, return a placeholder URL
  // In production, you would:
  // 1. Generate PDF using a library like pdfkit or puppeteer
  // 2. Upload to Cloudinary
  // 3. Return the Cloudinary URL
  
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/certificates/${certificateId}`;
};

/**
 * Issue certificate
 */
export const issueCertificate = async (userId, courseId) => {
  // Check if certificate already exists
  const existing = await prisma.certificate.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  });

  if (existing) {
    return existing;
  }

  // Check eligibility
  const eligibility = await checkCertificateEligibility(userId, courseId);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }

  // Generate certificate
  const certificateId = generateCertificateId();
  const certificateUrl = await generateCertificateUrl(userId, courseId, certificateId);

  const certificate = await prisma.certificate.create({
    data: {
      userId,
      courseId,
      certificateId,
      certificateUrl,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return certificate;
};

/**
 * Get user certificates
 */
export const getUserCertificates = async (userId) => {
  return prisma.certificate.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
        },
      },
    },
    orderBy: { issuedAt: 'desc' },
  });
};

/**
 * Get all certificates (admin only)
 */
export const getAllCertificates = async () => {
  return prisma.certificate.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { issuedAt: 'desc' },
  });
};

/**
 * Verify certificate
 */
export const verifyCertificate = async (certificateId) => {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return certificate;
};

export default {
  issueCertificate,
  getUserCertificates,
  getAllCertificates,
  verifyCertificate,
  checkCertificateEligibility,
};

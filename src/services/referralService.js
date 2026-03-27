import { prisma } from '../config/database.js';
import * as auditLogService from './auditLogService.js';

import crypto from 'crypto';
import { createHash } from 'crypto';


/**
 * Generate unique referral code
 */
const generateReferralCode = (userId, courseId) => {
  const hash = createHash('md5')
    .update(`${userId}-${courseId}-${Date.now()}`)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
  return `REF${hash}`;
};

const REFERRAL_ATTRIBUTION_WINDOW_DAYS = Math.max(
  1,
  parseInt(process.env.REFERRAL_ATTRIBUTION_WINDOW_DAYS || '30', 10)
);
const PAYOUT_BATCH_TTL_MINUTES = Math.max(
  5,
  parseInt(process.env.REFERRAL_PAYOUT_BATCH_TTL_MINUTES || '30', 10)
);

const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');

/**
 * Create or get referral link for user/course combination
 */
export const createReferralLink = async (userId, courseId) => {
  // Check if referral link already exists
  let referralLink = await prisma.referralLink.findFirst({
    where: {
      userId,
      courseId,
      isActive: true,
    },
  });

  if (referralLink) {
    return referralLink;
  }

  // Generate new referral code
  const referralCode = generateReferralCode(userId, courseId);

  // Create new referral link
  referralLink = await prisma.referralLink.create({
    data: {
      referralCode,
      userId,
      courseId,
      isActive: true,
    },
  });

  return referralLink;
};

/**
 * Get referral link by code
 */
export const getReferralLinkByCode = async (referralCode) => {
  return await prisma.referralLink.findUnique({
    where: { referralCode },
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
          slug: true,
          price: true,
          thumbnail: true,
        },
      },
    },
  });
};

/**
 * Track referral click
 */
export const trackReferralClick = async (referralCode, clickData) => {
  const referralLink = await getReferralLinkByCode(referralCode);

  if (!referralLink || !referralLink.isActive) {
    throw new Error('Invalid or inactive referral link');
  }

  // Fraud detection checks
  const isValidClick = await validateClick(referralLink, clickData);

  if (!isValidClick.valid) {
    // Log suspicious activity but still create the click record
    console.warn('Suspicious referral click detected:', isValidClick.reason);
  }

  // Create click record
  const click = await prisma.referralClick.create({
    data: {
      referralLinkId: referralLink.id,
      ipAddress: clickData.ipAddress,
      userAgent: clickData.userAgent,
      referrer: clickData.referrer,
      deviceInfo: clickData.deviceInfo,
      clickedById: clickData.userId,
      sessionId: clickData.sessionId,
      isValid: isValidClick.valid,
    },
  });

  // Update referral link stats
  await prisma.referralLink.update({
    where: { id: referralLink.id },
    data: {
      totalClicks: {
        increment: 1,
      },
    },
  });

  return click;
};

/**
 * Validate click for fraud prevention
 */
const validateClick = async (referralLink, clickData) => {
  const reasons = [];

  // 1. Check if referrer is trying to click their own link
  if (clickData.userId && clickData.userId === referralLink.userId) {
    reasons.push('Self-referral detected');
  }

  // 2. Check for suspicious IP patterns (multiple clicks from same IP in short time)
  if (clickData.ipAddress) {
    const recentClicks = await prisma.referralClick.count({
      where: {
        referralLinkId: referralLink.id,
        ipAddress: clickData.ipAddress,
        clickedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    if (recentClicks > 10) {
      reasons.push('Too many clicks from same IP in short time');
    }
  }

  // 3. Check session-based clicking (same session clicking multiple times)
  if (clickData.sessionId) {
    const sessionClicks = await prisma.referralClick.count({
      where: {
        referralLinkId: referralLink.id,
        sessionId: clickData.sessionId,
        clickedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (sessionClicks > 5) {
      reasons.push('Too many clicks from same session');
    }
  }

  // 4. Check for bot-like behavior (no referrer, suspicious user agent)
  if (!clickData.referrer && clickData.userAgent) {
    const suspiciousPatterns = ['bot', 'crawler', 'spider', 'scraper'];
    const userAgentLower = clickData.userAgent.toLowerCase();
    const isBot = suspiciousPatterns.some(pattern => userAgentLower.includes(pattern));

    if (isBot) {
      reasons.push('Bot-like user agent detected');
    }
  }

  return {
    valid: reasons.length === 0,
    reason: reasons.length > 0 ? reasons.join(', ') : null,
  };
};

const isClickWithinAttributionWindow = (clickedAt) => {
  if (!clickedAt) return false;
  const maxAgeMs = REFERRAL_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return (Date.now() - new Date(clickedAt).getTime()) <= maxAgeMs;
};

const resolveTrustedConversionClick = async (userId, courseId, clickId = null) => {
  if (clickId) {
    const explicitClick = await prisma.referralClick.findUnique({
      where: { id: clickId },
      include: { referralLink: true },
    });

    if (!explicitClick?.referralLink?.isActive) return null;
    if (!explicitClick.isValid) return null;
    if (!isClickWithinAttributionWindow(explicitClick.clickedAt)) return null;
    if (explicitClick.referralLink.courseId !== courseId) return null;

    // If click is tied to a logged-in user, it must match converter.
    if (explicitClick.clickedById && explicitClick.clickedById !== userId) return null;

    return explicitClick;
  }

  // Fallback attribution when clickId is unavailable.
  const click = await prisma.referralClick.findFirst({
    where: {
      referralLink: {
        courseId,
        isActive: true,
      },
      clickedById: userId,
      isValid: true,
      clickedAt: {
        gte: new Date(Date.now() - REFERRAL_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      referralLink: true,
    },
    orderBy: {
      clickedAt: 'desc',
    },
  });

  return click || null;
};

/**
 * Process referral conversion (when someone enrolls through a referral)
 */
export const processReferralConversion = async (userId, courseId, enrollmentId, clickId = null) => {
  const click = await resolveTrustedConversionClick(userId, courseId, clickId);
  if (!click || !click.referralLink?.isActive) {
    return null; // No valid referral found
  }

  // Hard block self-conversion (not just fraud-flag).
  if (click.referralLink.userId === userId) {
    await auditLogService.createAuditLog({
      userId,
      action: 'REFERRAL_SELF_CONVERSION_BLOCKED',
      entityType: 'REFERRAL_CONVERSION',
      entityId: enrollmentId,
      description: 'Blocked self-conversion attribution',
      metadata: {
        clickId: click.id,
        courseId,
        referralLinkId: click.referralLink.id,
      },
      riskScore: 80,
    });
    return null;
  }

  // Check if conversion already exists
  const existingConversion = await prisma.referralConversion.findUnique({
    where: {
      clickId_enrollmentId: {
        clickId: click.id,
        enrollmentId,
      },
    },
  });

  if (existingConversion) {
    return existingConversion; // Already processed
  }

  // Enforce one referral commission per user+course to prevent replay/abuse.
  const existingCourseConversion = await prisma.referralConversion.findFirst({
    where: {
      convertedById: userId,
      courseId,
      isFraudulent: false,
      status: { not: 'CANCELLED' },
    },
    select: { id: true },
  });
  if (existingCourseConversion) {
    return null;
  }

  // Get course details for commission calculation
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { price: true, isFree: true },
  });

  if (!course || course.isFree) {
    return null; // No commission for free courses
  }

  // Calculate commission (default 10%)
  const commissionRate = 10.00; // Could be configurable per user/course
  const commissionAmount = (parseFloat(course.price) * commissionRate) / 100;

  // Create conversion record
  const conversion = await prisma.referralConversion.create({
    data: {
      referralLinkId: click.referralLink.id,
      clickId: click.id,
      convertedById: userId,
      enrollmentId,
      courseId,
      commissionAmount,
      commissionRate,
      status: 'PENDING',
      isFraudulent: false, // We'll do additional fraud checks
    },
  });

  // Update referral link stats
  await prisma.referralLink.update({
    where: { id: click.referralLink.id },
    data: {
      totalConversions: {
        increment: 1,
      },
    },
  });

  // Additional fraud detection for conversion
  const fraudCheck = await validateConversion(conversion);
  if (!fraudCheck.valid) {
    await prisma.referralConversion.update({
      where: { id: conversion.id },
      data: {
        isFraudulent: true,
        fraudReason: fraudCheck.reason,
      },
    });
  }

  return conversion;
};

/**
 * Validate conversion for fraud
 */
const validateConversion = async (conversion) => {
  const reasons = [];

  const conversionWithRelations = await prisma.referralConversion.findUnique({
    where: { id: conversion.id },
    include: {
      referralLink: {
        select: { userId: true },
      },
      click: {
        select: { clickedAt: true },
      },
    },
  });
  if (!conversionWithRelations) {
    return { valid: false, reason: 'Conversion record missing' };
  }

  // 1. Check if converter is the referrer
  if (conversionWithRelations.convertedById === conversionWithRelations.referralLink.userId) {
    reasons.push('Self-conversion detected');
  }

  // 2. Check conversion time (too quick after click might be suspicious)
  const click = conversionWithRelations.click;

  if (click) {
    const timeDiff = Date.now() - new Date(click.clickedAt).getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff < 1) {
      reasons.push('Conversion too quick after click');
    }
  }

  // 3. Check for multiple conversions from same click
  const multipleConversions = await prisma.referralConversion.count({
    where: {
      clickId: conversionWithRelations.clickId,
      convertedById: {
        not: conversionWithRelations.convertedById, // Exclude current conversion
      },
    },
  });

  if (multipleConversions > 0) {
    reasons.push('Multiple conversions from same click');
  }

  return {
    valid: reasons.length === 0,
    reason: reasons.length > 0 ? reasons.join(', ') : null,
  };
};

/**
 * Get referral statistics for a user
 */
export const getReferralStats = async (userId) => {
  const referralLinks = await prisma.referralLink.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          price: true,
        },
      },
      conversions: {
        where: { isFraudulent: false },
        select: {
          commissionAmount: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          clicks: true,
        },
      },
    },
  });

  const stats = {
    totalLinks: referralLinks.length,
    totalClicks: 0,
    totalConversions: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    links: [],
  };

  for (const link of referralLinks) {
    const linkStats = {
      id: link.id,
      referralCode: link.referralCode,
      course: link.course,
      clicks: link._count?.clicks ?? 0,
      conversions: link.conversions.length,
      earnings: link.conversions.reduce((sum, conv) => sum + parseFloat(conv.commissionAmount), 0),
      status: link.isActive ? 'ACTIVE' : 'INACTIVE',
      createdAt: link.createdAt,
    };

    stats.totalClicks += (link._count?.clicks ?? 0);
    stats.totalConversions += link.conversions.length;

    // Calculate earnings by status
    for (const conversion of link.conversions) {
      const amount = parseFloat(conversion.commissionAmount);
      stats.totalEarnings += amount;

      if (conversion.status === 'PENDING') {
        stats.pendingEarnings += amount;
      } else if (conversion.status === 'PAID') {
        stats.paidEarnings += amount;
      }
    }

    stats.links.push(linkStats);
  }

  return stats;
};

/**
 * Get referral analytics for admin
 */
export const getReferralAnalytics = async (filters = {}) => {
  const { startDate, endDate, status } = filters;

  const where = {};
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }
  if (status) {
    where.status = status;
  }

  const [
    totalLinks,
    totalClicks,
    totalConversions,
    totalCommission,
    conversionsByStatus,
  ] = await Promise.all([
    prisma.referralLink.count(),
    prisma.referralClick.count(where),
    prisma.referralConversion.count(where),
    prisma.referralConversion.aggregate({
      where,
      _sum: { commissionAmount: true },
    }),
    prisma.referralConversion.groupBy({
      by: ['status'],
      where,
      _count: true,
      _sum: { commissionAmount: true },
    }),
  ]);

  return {
    totalLinks,
    totalClicks,
    totalConversions,
    totalCommission: totalCommission._sum.commissionAmount || 0,
    conversionsByStatus,
  };
};

/**
 * Mark referral commissions as paid (Admin function)
 */
export const markReferralCommissionsAsPaid = async (conversionIds) => {
  const conversions = await prisma.referralConversion.findMany({
    where: {
      id: { in: conversionIds },
      status: 'PENDING',
      isFraudulent: false,
    },
  });

  if (conversions.length === 0) {
    throw new Error('No valid pending conversions found');
  }

  // Update conversions
  await prisma.referralConversion.updateMany({
    where: {
      id: { in: conversionIds },
    },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  return {
    conversionsUpdated: conversions.length,
    totalAmount: conversions.reduce((sum, conv) => sum + parseFloat(conv.commissionAmount), 0),
  };
};

/**
 * Generate social sharing URLs
 */
export const generateSharingUrls = async (userId, courseId, baseUrl, courseSlug = null) => {
  const referralLink = await createReferralLink(userId, courseId);

  let slug = courseSlug;
  if (!slug) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { slug: true }
    });
    slug = course?.slug || courseId;
  }
  const shareUrl = `${baseUrl}/courses/${slug}?ref=${referralLink.referralCode}`;

  return {
    referralCode: referralLink.referralCode,
    shareUrl,
    facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    linkedinUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    twitterUrl: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`Check out this course: ${shareUrl}`)}`,
  };
};

/**
 * Prepare payout batch (step 1/2): validates conversions and issues a short-lived confirmation token.
 */
export const prepareReferralPayoutBatch = async (adminUserId, conversionIds = []) => {
  if (!Array.isArray(conversionIds) || conversionIds.length === 0) {
    throw new Error('Conversion IDs array is required');
  }

  const conversions = await prisma.referralConversion.findMany({
    where: {
      id: { in: conversionIds },
      status: 'PENDING',
      isFraudulent: false,
    },
    select: {
      id: true,
      commissionAmount: true,
      referralLink: { select: { userId: true } },
    },
  });

  if (conversions.length === 0) {
    throw new Error('No valid pending conversions found');
  }

  const payoutBatchId = crypto.randomUUID();
  const confirmationToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + PAYOUT_BATCH_TTL_MINUTES * 60 * 1000);
  const totalAmount = conversions.reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0);
  const affiliatesAffected = new Set(conversions.map((c) => c.referralLink.userId)).size;

  await auditLogService.createAuditLog({
    userId: adminUserId,
    action: 'REFERRAL_PAYOUT_PREPARED',
    entityType: 'REFERRAL_PAYOUT',
    entityId: payoutBatchId,
    description: `Prepared referral payout batch for ${conversions.length} conversions`,
    metadata: {
      conversionIds: conversions.map((c) => c.id),
      totalAmount,
      affiliatesAffected,
      expiresAt: expiresAt.toISOString(),
      confirmationTokenHash: hashToken(confirmationToken),
    },
    riskScore: 50,
  });

  return {
    payoutBatchId,
    confirmationToken,
    expiresAt: expiresAt.toISOString(),
    conversionsCount: conversions.length,
    affiliatesAffected,
    totalAmount,
  };
};

/**
 * Confirm payout batch (step 2/2) with idempotency key.
 */
export const confirmReferralPayoutBatch = async ({
  adminUserId,
  payoutBatchId,
  confirmationToken,
  idempotencyKey,
}) => {
  if (!idempotencyKey || !String(idempotencyKey).trim()) {
    throw new Error('Idempotency key is required');
  }

  const existingIdempotentResult = await prisma.auditLog.findFirst({
    where: {
      entityType: 'REFERRAL_PAYOUT_IDEMPOTENCY',
      entityId: String(idempotencyKey).trim(),
    },
    orderBy: { createdAt: 'desc' },
  });
  if (existingIdempotentResult?.metadata?.result) {
    return existingIdempotentResult.metadata.result;
  }

  const prepared = await prisma.auditLog.findFirst({
    where: {
      action: 'REFERRAL_PAYOUT_PREPARED',
      entityType: 'REFERRAL_PAYOUT',
      entityId: payoutBatchId,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!prepared) {
    throw new Error('Payout batch not found');
  }
  if (!prepared.userId) {
    throw new Error('Payout preparer is invalid');
  }

  const meta = prepared.metadata || {};
  const expectedHash = meta.confirmationTokenHash;
  const expiresAt = meta.expiresAt ? new Date(meta.expiresAt) : null;
  const conversionIds = Array.isArray(meta.conversionIds) ? meta.conversionIds : [];

  if (!expectedHash || hashToken(confirmationToken) !== expectedHash) {
    throw new Error('Invalid confirmation token');
  }
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    throw new Error('Payout confirmation token expired');
  }
  if (conversionIds.length === 0) {
    throw new Error('No conversions attached to payout batch');
  }

  await auditLogService.createAuditLog({
    userId: adminUserId,
    action: 'REFERRAL_PAYOUT_CONFIRMED',
    entityType: 'REFERRAL_PAYOUT',
    entityId: payoutBatchId,
    description: 'Referral payout batch confirmed by admin',
    metadata: {
      idempotencyKey: String(idempotencyKey).trim(),
      conversionIds,
    },
    riskScore: 65,
  });

  const result = await markReferralCommissionsAsPaid(conversionIds);

  await auditLogService.createAuditLog({
    userId: adminUserId,
    action: 'REFERRAL_PAYOUT_EXECUTED',
    entityType: 'REFERRAL_PAYOUT',
    entityId: payoutBatchId,
    description: `Executed referral payout batch (${result.conversionsUpdated} conversions)`,
    metadata: {
      idempotencyKey: String(idempotencyKey).trim(),
      result,
    },
    riskScore: 70,
  });
  await auditLogService.createAuditLog({
    userId: adminUserId,
    action: 'REFERRAL_PAYOUT_IDEMPOTENT_COMMIT',
    entityType: 'REFERRAL_PAYOUT_IDEMPOTENCY',
    entityId: String(idempotencyKey).trim(),
    description: 'Idempotency checkpoint for referral payout',
    metadata: {
      payoutBatchId,
      result,
    },
    riskScore: 30,
  });

  return result;
};

/**
 * Security report for monitoring suspicious activity.
 */
export const getReferralSecurityReport = async ({ hours = 24 } = {}) => {
  const windowStart = new Date(Date.now() - Math.max(1, Number(hours)) * 60 * 60 * 1000);

  const [clicksTotal, invalidClicks, fraudulentConversions, pendingHighRiskLogs] = await Promise.all([
    prisma.referralClick.count({ where: { clickedAt: { gte: windowStart } } }),
    prisma.referralClick.count({ where: { clickedAt: { gte: windowStart }, isValid: false } }),
    prisma.referralConversion.count({ where: { createdAt: { gte: windowStart }, isFraudulent: true } }),
    prisma.auditLog.count({
      where: {
        createdAt: { gte: windowStart },
        entityType: { in: ['REFERRAL_CONVERSION', 'REFERRAL_PAYOUT'] },
        flagged: true,
      },
    }),
  ]);

  return {
    windowHours: Math.max(1, Number(hours)),
    clicksTotal,
    invalidClicks,
    invalidClickRate: clicksTotal > 0 ? Number((invalidClicks / clicksTotal).toFixed(4)) : 0,
    fraudulentConversions,
    flaggedReferralAuditEvents: pendingHighRiskLogs,
  };
};

/**
 * Retention maintenance: anonymize old click PII while retaining aggregates.
 */
export const applyReferralRetentionPolicy = async ({ retentionDays = 90 } = {}) => {
  const days = Math.max(30, Number(retentionDays) || 90);
  const beforeDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await prisma.referralClick.updateMany({
    where: {
      clickedAt: { lt: beforeDate },
      OR: [
        { ipAddress: { not: null } },
        { userAgent: { not: null } },
        { sessionId: { not: null } },
      ],
    },
    data: {
      ipAddress: null,
      userAgent: null,
      sessionId: null,
      deviceInfo: null,
    },
  });

  return {
    retentionDays: days,
    anonymizedClicks: result.count,
    beforeDate: beforeDate.toISOString(),
  };
};

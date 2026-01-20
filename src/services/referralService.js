import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

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

/**
 * Process referral conversion (when someone enrolls through a referral)
 */
export const processReferralConversion = async (userId, courseId, enrollmentId, clickId = null) => {
  // Find the most recent valid click for this user/course combination
  let click;

  if (clickId) {
    // If click ID is provided, use it
    click = await prisma.referralClick.findUnique({
      where: { id: clickId },
      include: { referralLink: true },
    });
  } else {
    // Find the most recent valid click for this user/course
    click = await prisma.referralClick.findFirst({
      where: {
        referralLink: {
          courseId,
        },
        clickedById: userId,
        isValid: true,
      },
      include: {
        referralLink: true,
      },
      orderBy: {
        clickedAt: 'desc',
      },
    });
  }

  if (!click || !click.referralLink.isActive) {
    return null; // No valid referral found
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

  // 1. Check if converter is the referrer
  if (conversion.convertedById === conversion.referralLink.userId) {
    reasons.push('Self-conversion detected');
  }

  // 2. Check conversion time (too quick after click might be suspicious)
  const click = await prisma.referralClick.findUnique({
    where: { id: conversion.clickId },
    select: { clickedAt: true },
  });

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
      clickId: conversion.clickId,
      convertedById: {
        not: conversion.convertedById, // Exclude current conversion
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
      clicks: link.totalClicks,
      conversions: link.conversions.length,
      earnings: link.conversions.reduce((sum, conv) => sum + parseFloat(conv.commissionAmount), 0),
      status: link.isActive ? 'ACTIVE' : 'INACTIVE',
      createdAt: link.createdAt,
    };

    stats.totalClicks += link.totalClicks;
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

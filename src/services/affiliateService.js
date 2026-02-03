import { prisma } from '../config/database.js';



/**
 * Generate unique affiliate code
 */
const generateAffiliateCode = (userId) => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AFF${userId.substring(0, 8).toUpperCase()}${random}`;
};

/**
 * Register as affiliate
 */
export const registerAffiliate = async (userId, affiliateData) => {
  // Check if user is already an affiliate
  const existing = await prisma.affiliate.findUnique({
    where: { userId },
  });

  if (existing) {
    throw new Error('User is already registered as an affiliate');
  }

  // Generate affiliate code
  const affiliateCode = generateAffiliateCode(userId);

  const affiliate = await prisma.affiliate.create({
    data: {
      userId,
      affiliateCode,
      status: 'PENDING',
      commissionRate: affiliateData.commissionRate || 10.0,
      bankName: affiliateData.bankName || null,
      accountNumber: affiliateData.accountNumber || null,
      ifscCode: affiliateData.ifscCode || null,
      panNumber: affiliateData.panNumber || null,
    },
  });

  return affiliate;
};

/**
 * Calculate commission for an enrollment
 */
export const calculateCommission = async (enrollmentId, courseId, amount) => {
  // Get enrollment with affiliate
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      affiliate: true,
    },
  });

  if (!enrollment || !enrollment.affiliateId) {
    return null;
  }

  // Get affiliate details
  const affiliate = enrollment.affiliate;

  // Check if affiliate is approved
  if (affiliate.status !== 'APPROVED') {
    return null;
  }

  // Calculate commission
  const commissionRate = parseFloat(affiliate.commissionRate);
  const commissionAmount = (parseFloat(amount) * commissionRate) / 100;

  // Create affiliate earning
  const earning = await prisma.affiliateEarning.create({
    data: {
      affiliateId: affiliate.id,
      courseId,
      enrollmentId,
      amount: commissionAmount,
      commissionRate,
      status: 'PENDING',
    },
  });

  // Update affiliate totals
  await prisma.affiliate.update({
    where: { id: affiliate.id },
    data: {
      pendingEarnings: {
        increment: commissionAmount,
      },
      totalEarnings: {
        increment: commissionAmount,
      },
    },
  });

  return earning;
};

/**
 * Mark earnings as paid
 */
export const markEarningsAsPaid = async (earningIds, paidAt = new Date()) => {
  const earnings = await prisma.affiliateEarning.findMany({
    where: {
      id: {
        in: earningIds,
      },
      status: 'PENDING',
    },
    include: {
      affiliate: true,
    },
  });

  if (earnings.length === 0) {
    throw new Error('No pending earnings found');
  }

  // Group by affiliate
  const affiliateTotals = {};
  let totalAmount = 0;

  for (const earning of earnings) {
    const affiliateId = earning.affiliateId;
    if (!affiliateTotals[affiliateId]) {
      affiliateTotals[affiliateId] = {
        affiliateId,
        amount: 0,
      };
    }
    affiliateTotals[affiliateId].amount += parseFloat(earning.amount);
    totalAmount += parseFloat(earning.amount);
  }

  // Update earnings
  await prisma.affiliateEarning.updateMany({
    where: {
      id: {
        in: earningIds,
      },
    },
    data: {
      status: 'PAID',
      paidAt,
    },
  });

  // Update affiliate balances
  for (const [affiliateId, totals] of Object.entries(affiliateTotals)) {
    await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        pendingEarnings: {
          decrement: totals.amount,
        },
        paidEarnings: {
          increment: totals.amount,
        },
      },
    });
  }

  return {
    earningsUpdated: earnings.length,
    totalAmount,
    affiliatesAffected: Object.keys(affiliateTotals).length,
  };
};

/**
 * Get affiliate statistics
 */
export const getAffiliateStats = async (affiliateId) => {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    include: {
      earnings: {
        select: {
          amount: true,
          commissionRate: true,
          status: true,
        },
      },
      enrollments: {
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
  });

  if (!affiliate) {
    return null;
  }

  const stats = {
    totalReferrals: affiliate.enrollments.length,
    totalEarnings: parseFloat(affiliate.totalEarnings),
    pendingEarnings: parseFloat(affiliate.pendingEarnings),
    paidEarnings: parseFloat(affiliate.paidEarnings),
    commissionRate: parseFloat(affiliate.commissionRate),
    earningsByStatus: {
      PENDING: 0,
      PAID: 0,
    },
  };

  for (const earning of affiliate.earnings) {
    stats.earningsByStatus[earning.status] += parseFloat(earning.amount);
  }

  return stats;
};


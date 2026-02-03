import { prisma } from '../config/database.js';

import { calculateRiskScore } from './auditLogService.js';


/**
 * Check for fraudulent payment patterns
 */
export const detectFraudulentPayment = async (paymentData) => {
  const {
    userId,
    amount,
    paymentMethod,
    ipAddress,
    userAgent,
    transactionId,
  } = paymentData;

  const risks = [];
  let riskLevel = 'LOW';
  let riskScore = 0;

  // Check 1: Multiple payments from same user in short time
  const recentPayments = await prisma.payment.count({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      },
    },
  });

  if (recentPayments > 5) {
    risks.push({
      type: 'VELOCITY_CHECK',
      message: `User made ${recentPayments} payments in the last hour`,
      severity: 'HIGH',
    });
    riskScore += 30;
  }

  // Check 2: Unusually large amount
  if (amount > 100000) {
    risks.push({
      type: 'LARGE_AMOUNT',
      message: `Payment amount (${amount}) exceeds normal threshold`,
      severity: 'MEDIUM',
    });
    riskScore += 20;
  }

  // Check 3: Multiple payments with same IP but different users
  const sameIPPayments = await prisma.payment.count({
    where: {
      metadata: {
        path: ['ipAddress'],
        equals: ipAddress,
      },
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000),
      },
      NOT: {
        userId,
      },
    },
  });

  if (sameIPPayments > 3) {
    risks.push({
      type: 'IP_REUSE',
      message: `IP address ${ipAddress} used for ${sameIPPayments} different users`,
      severity: 'HIGH',
    });
    riskScore += 40;
  }

  // Check 4: Rapid successive transactions
  const lastPayment = await prisma.payment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (lastPayment) {
    const timeDiff = Date.now() - lastPayment.createdAt.getTime();
    if (timeDiff < 60000) { // Less than 1 minute
      risks.push({
        type: 'RAPID_TRANSACTIONS',
        message: 'Payment made within 1 minute of previous payment',
        severity: 'MEDIUM',
      });
      riskScore += 15;
    }
  }

  // Check 5: Device fingerprinting (basic check)
  if (!userAgent || userAgent.length < 20) {
    risks.push({
      type: 'SUSPICIOUS_USER_AGENT',
      message: 'Missing or suspicious user agent',
      severity: 'LOW',
    });
    riskScore += 10;
  }

  // Determine risk level
  if (riskScore >= 70) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 40) {
    riskLevel = 'MEDIUM';
  }

  return {
    isFraudulent: riskLevel === 'HIGH',
    riskLevel,
    riskScore,
    risks,
  };
};

/**
 * Check for velocity-based fraud
 */
export const checkVelocity = async (userId, timeframeMinutes = 60) => {
  const startTime = new Date(Date.now() - timeframeMinutes * 60 * 1000);
  
  const count = await prisma.payment.count({
    where: {
      userId,
      createdAt: {
        gte: startTime,
      },
    },
  });

  const totalAmount = await prisma.payment.aggregate({
    where: {
      userId,
      createdAt: {
        gte: startTime,
      },
      status: 'COMPLETED',
    },
    _sum: {
      finalAmount: true,
    },
  });

  return {
    count,
    totalAmount: totalAmount._sum.finalAmount || 0,
    timeframeMinutes,
  };
};

/**
 * Flag suspicious user for review
 */
export const flagSuspiciousUser = async (userId, reason) => {
  // Log to audit
  const { createAuditLog } = await import('./auditLogService.js');
  await createAuditLog({
    userId,
    action: 'USER_FLAGGED',
    entityType: 'USER',
    entityId: userId,
    description: `User flagged as suspicious: ${reason}`,
    riskScore: 100,
  });

  // Could also send notification to admin
  return true;
};

export default {
  detectFraudulentPayment,
  checkVelocity,
  flagSuspiciousUser,
};


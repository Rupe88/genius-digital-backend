import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create audit log entry
 */
export const createAuditLog = async (data) => {
  try {
    const {
      userId = null,
      action,
      entityType,
      entityId = null,
      description = null,
      ipAddress = null,
      userAgent = null,
      requestMethod = null,
      requestPath = null,
      changes = null,
      metadata = null,
      riskScore = 0,
    } = data;

    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        description,
        ipAddress,
        userAgent,
        requestMethod,
        requestPath,
        changes,
        metadata,
        riskScore,
        flagged: riskScore >= 70, // Flag high-risk activities
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit log creation failed:', error);
    return null;
  }
};

/**
 * Get audit logs with filters
 */
export const getAuditLogs = async (filters = {}) => {
  const {
    userId = null,
    action = null,
    entityType = null,
    entityId = null,
    flagged = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50,
  } = filters;

  const where = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (flagged !== null) where.flagged = flagged;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Calculate risk score for an action
 */
export const calculateRiskScore = (data) => {
  let riskScore = 0;

  const {
    action,
    userId,
    ipAddress,
    requestPath,
    amount = 0,
    isAdmin = false,
    userAgent = null,
  } = data;

  // High-risk actions
  if (['PAYMENT', 'REFUND', 'DELETE', 'UPDATE_PAYMENT'].includes(action)) {
    riskScore += 20;
  }

  // Large amounts increase risk
  if (amount > 10000) riskScore += 15;
  if (amount > 50000) riskScore += 15;

  // Admin actions are higher risk
  if (isAdmin) riskScore += 10;

  // Sensitive endpoints
  if (requestPath?.includes('/admin') || requestPath?.includes('/payment')) {
    riskScore += 10;
  }

  // Missing or suspicious user agent
  if (!userAgent || userAgent.length < 10) {
    riskScore += 5;
  }

  // Time-based risk (unusual hours)
  const hour = new Date().getHours();
  if (hour < 6 || hour > 23) {
    riskScore += 5;
  }

  return Math.min(riskScore, 100);
};

export default {
  createAuditLog,
  getAuditLogs,
  calculateRiskScore,
};


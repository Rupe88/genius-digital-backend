import { prisma } from '../config/database.js';



/**
 * Get payment analytics
 */
export const getPaymentAnalytics = async (filters = {}) => {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate = new Date(),
    paymentMethod = null,
  } = filters;

  const where = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  // Total statistics
  const [
    totalPayments,
    completedPayments,
    failedPayments,
    pendingPayments,
    totalRevenue,
    totalRefunded,
    paymentMethods,
    dailyRevenue,
  ] = await Promise.all([
    // Total count
    prisma.payment.count({ where }),
    
    // Completed count
    prisma.payment.count({
      where: { ...where, status: 'COMPLETED' },
    }),
    
    // Failed count
    prisma.payment.count({
      where: { ...where, status: 'FAILED' },
    }),
    
    // Pending count
    prisma.payment.count({
      where: { ...where, status: 'PENDING' },
    }),
    
    // Total revenue
    prisma.payment.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _sum: { finalAmount: true },
    }),
    
    // Total refunded
    prisma.payment.aggregate({
      where: { ...where, status: 'REFUNDED' },
      _sum: { finalAmount: true },
    }),
    
    // Payment methods breakdown
    prisma.payment.groupBy({
      by: ['paymentMethod'],
      where,
      _count: { paymentMethod: true },
      _sum: { finalAmount: true },
    }),
    
    // Daily revenue
    prisma.$queryRaw`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count,
        SUM(finalAmount) as revenue
      FROM payments
      WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
        AND status = 'COMPLETED'
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `,
  ]);

  // Success rate
  const successRate = totalPayments > 0
    ? (completedPayments / totalPayments) * 100
    : 0;

  // Average transaction value
  const avgTransactionValue = completedPayments > 0
    ? (totalRevenue._sum.finalAmount || 0) / completedPayments
    : 0;

  return {
    overview: {
      totalPayments,
      completedPayments,
      failedPayments,
      pendingPayments,
      successRate: parseFloat(successRate.toFixed(2)),
      totalRevenue: parseFloat((totalRevenue._sum.finalAmount || 0).toString()),
      totalRefunded: parseFloat((totalRefunded._sum.finalAmount || 0).toString()),
      netRevenue: parseFloat(
        ((totalRevenue._sum.finalAmount || 0) - (totalRefunded._sum.finalAmount || 0)).toString()
      ),
      avgTransactionValue: parseFloat(avgTransactionValue.toFixed(2)),
    },
    paymentMethods: paymentMethods.map((method) => ({
      method: method.paymentMethod,
      count: method._count.paymentMethod,
      revenue: parseFloat((method._sum.finalAmount || 0).toString()),
    })),
    dailyRevenue,
    period: {
      startDate,
      endDate,
    },
  };
};

/**
 * Get payment trends
 */
export const getPaymentTrends = async (days = 30) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const trends = await prisma.$queryRaw`
    SELECT 
      DATE(createdAt) as date,
      paymentMethod,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'COMPLETED' THEN finalAmount ELSE 0 END) as revenue,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
    FROM payments
    WHERE createdAt >= ${startDate}
    GROUP BY DATE(createdAt), paymentMethod
    ORDER BY date DESC
  `;

  return trends;
};

/**
 * Get top payment methods
 */
export const getTopPaymentMethods = async (limit = 5) => {
  const methods = await prisma.payment.groupBy({
    by: ['paymentMethod'],
    _count: { paymentMethod: true },
    _sum: { finalAmount: true },
    orderBy: {
      _count: {
        paymentMethod: 'desc',
      },
    },
    take: limit,
  });

  return methods.map((method) => ({
    method: method.paymentMethod,
    count: method._count.paymentMethod,
    revenue: parseFloat((method._sum.finalAmount || 0).toString()),
  }));
};

export default {
  getPaymentAnalytics,
  getPaymentTrends,
  getTopPaymentMethods,
};


import { prisma } from '../config/database.js';
import * as expenseService from './expenseService.js';
import * as instructorEarningService from './instructorEarningService.js';

/**
 * Calculate total income from payments
 */
export const calculateIncome = async (startDate, endDate) => {
  const where = {
    status: 'COMPLETED', // Only count successful payments
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  // Get all completed payments
  const payments = await prisma.payment.findMany({
    where,
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  let courseSales = 0;
  let productSales = 0;
  let eventRegistrations = 0;
  const courseSalesDetail = {};
  const paymentMethodBreakdown = {};

  for (const payment of payments) {
    const amount = parseFloat(payment.finalAmount);

    // Categorize by source
    if (payment.courseId) {
      courseSales += amount;
      const courseId = payment.course.id;
      if (!courseSalesDetail[courseId]) {
        courseSalesDetail[courseId] = {
          courseId: payment.course.id,
          courseTitle: payment.course.title,
          total: 0,
          count: 0,
        };
      }
      courseSalesDetail[courseId].total += amount;
      courseSalesDetail[courseId].count += 1;
    } else if (payment.orderId && payment.order) {
      // Product sales
      productSales += amount;
    } else {
      // Could be event registrations or other
      eventRegistrations += amount;
    }

    // Payment method breakdown
    const method = payment.paymentMethod;
    if (!paymentMethodBreakdown[method]) {
      paymentMethodBreakdown[method] = 0;
    }
    paymentMethodBreakdown[method] += amount;
  }

  const totalRevenue = courseSales + productSales + eventRegistrations;

  return {
    totalRevenue,
    courseSales,
    productSales,
    eventRegistrations,
    courseSalesDetail: Object.values(courseSalesDetail).sort((a, b) => b.total - a.total),
    paymentMethodBreakdown,
    paymentCount: payments.length,
  };
};

/**
 * Calculate total expenses
 */
export const calculateExpenses = async (startDate, endDate) => {
  const expenseStats = await expenseService.getExpenseStatistics({
    startDate,
    endDate,
  });

  return {
    totalExpenses: expenseStats.totalExpenses,
    byCategory: expenseStats.byCategory,
    byStatus: expenseStats.byStatus,
    count: expenseStats.count,
  };
};

/**
 * Calculate salary expenses (instructor commissions)
 */
export const calculateSalaryExpenses = async (startDate, endDate) => {
  const where = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  // Get all instructor earnings (both paid and pending)
  const earnings = await prisma.instructorEarning.findMany({
    where,
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
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

  let totalSalaries = 0;
  let paidSalaries = 0;
  let pendingSalaries = 0;
  const byInstructor = {};
  const byStatus = {};

  for (const earning of earnings) {
    const amount = parseFloat(earning.amount);
    totalSalaries += amount;

    if (earning.status === 'PAID') {
      paidSalaries += amount;
    } else if (earning.status === 'PENDING') {
      pendingSalaries += amount;
    }

    // Group by instructor
    const instructorId = earning.instructorId;
    if (!byInstructor[instructorId]) {
      byInstructor[instructorId] = {
        instructorId: earning.instructor.id,
        instructorName: earning.instructor.name,
        total: 0,
        paid: 0,
        pending: 0,
      };
    }
    byInstructor[instructorId].total += amount;
    if (earning.status === 'PAID') {
      byInstructor[instructorId].paid += amount;
    } else {
      byInstructor[instructorId].pending += amount;
    }

    // Group by status
    if (!byStatus[earning.status]) {
      byStatus[earning.status] = 0;
    }
    byStatus[earning.status] += amount;
  }

  // Also get affiliate commissions
  const affiliateEarnings = await prisma.affiliateEarning.findMany({
    where,
    include: {
      affiliate: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    },
  });

  let totalAffiliateCommissions = 0;
  let paidAffiliateCommissions = 0;
  let pendingAffiliateCommissions = 0;

  for (const earning of affiliateEarnings) {
    const amount = parseFloat(earning.amount);
    totalAffiliateCommissions += amount;

    if (earning.status === 'PAID') {
      paidAffiliateCommissions += amount;
    } else {
      pendingAffiliateCommissions += amount;
    }
  }

  return {
    totalSalaries,
    paidSalaries,
    pendingSalaries,
    byInstructor: Object.values(byInstructor),
    byStatus,
    instructorEarningsCount: earnings.length,
    affiliateCommissions: {
      total: totalAffiliateCommissions,
      paid: paidAffiliateCommissions,
      pending: pendingAffiliateCommissions,
      count: affiliateEarnings.length,
    },
    totalCommissions: totalSalaries + totalAffiliateCommissions,
  };
};

/**
 * Calculate profit/loss statement
 */
export const calculateProfitLoss = async (startDate, endDate) => {
  const [income, expenses, salaries] = await Promise.all([
    calculateIncome(startDate, endDate),
    calculateExpenses(startDate, endDate),
    calculateSalaryExpenses(startDate, endDate),
  ]);

  // Cost of Goods Sold (COGS)
  const cogs = {
    instructorCommissions: salaries.paidSalaries, // Only paid salaries count as COGS
    affiliateCommissions: salaries.affiliateCommissions.paid,
    totalCOGS: salaries.paidSalaries + salaries.affiliateCommissions.paid,
  };

  // Gross Profit = Revenue - COGS
  const grossProfit = income.totalRevenue - cogs.totalCOGS;

  // Operating Expenses (excluding salaries which are in COGS)
  const operatingExpenses = {
    marketing: expenses.byCategory.MARKETING || 0,
    infrastructure: expenses.byCategory.INFRASTRUCTURE || 0,
    software: expenses.byCategory.SOFTWARE || 0,
    hardware: expenses.byCategory.HARDWARE || 0,
    officeRent: expenses.byCategory.OFFICE_RENT || 0,
    utilities: expenses.byCategory.UTILITIES || 0,
    insurance: expenses.byCategory.INSURANCE || 0,
    professionalServices: expenses.byCategory.PROFESSIONAL_SERVICES || 0,
    travel: expenses.byCategory.TRAVEL || 0,
    training: expenses.byCategory.TRAINING || 0,
    other: expenses.byCategory.OTHER || 0,
    // Exclude SALARY category as it's handled separately in COGS
    totalOperatingExpenses: Object.entries(expenses.byCategory)
      .filter(([category]) => category !== 'SALARY')
      .reduce((sum, [, amount]) => sum + (parseFloat(amount) || 0), 0),
  };

  // Net Profit = Gross Profit - Operating Expenses
  const netProfit = grossProfit - operatingExpenses.totalOperatingExpenses;
  const netProfitMargin =
    income.totalRevenue > 0 ? (netProfit / income.totalRevenue) * 100 : 0;

  return {
    period: {
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
    },
    revenue: {
      courseSales: income.courseSales,
      productSales: income.productSales,
      eventRegistrations: income.eventRegistrations,
      totalRevenue: income.totalRevenue,
    },
    costOfGoodsSold: {
      instructorCommissions: cogs.instructorCommissions,
      affiliateCommissions: cogs.affiliateCommissions,
      totalCOGS: cogs.totalCOGS,
    },
    grossProfit,
    grossProfitMargin:
      income.totalRevenue > 0 ? (grossProfit / income.totalRevenue) * 100 : 0,
    operatingExpenses,
    netProfit,
    netProfitMargin,
    pendingLiabilities: {
      pendingInstructorSalaries: salaries.pendingSalaries,
      pendingAffiliateCommissions: salaries.affiliateCommissions.pending,
      pendingExpenses: expenses.byStatus.PENDING || 0,
      totalPending: salaries.pendingSalaries + salaries.affiliateCommissions.pending + (expenses.byStatus.PENDING || 0),
    },
  };
};

/**
 * Get financial summary
 */
export const getFinancialSummary = async () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);

  const [todayIncome, thisWeekIncome, thisMonthIncome, thisYearIncome, totalIncome, todayExpenses, thisMonthExpenses, salaries] = await Promise.all([
    calculateIncome(today.toISOString(), now.toISOString()),
    calculateIncome(thisWeekStart.toISOString(), now.toISOString()),
    calculateIncome(thisMonthStart.toISOString(), now.toISOString()),
    calculateIncome(thisYearStart.toISOString(), now.toISOString()),
    calculateIncome(null, null), // all-time total
    calculateExpenses(today.toISOString(), now.toISOString()),
    calculateExpenses(thisMonthStart.toISOString(), now.toISOString()),
    calculateSalaryExpenses(null, null),
  ]);

  const todayProfit = todayIncome.totalRevenue - todayExpenses.totalExpenses;
  const thisMonthProfit = thisMonthIncome.totalRevenue - thisMonthExpenses.totalExpenses;

  return {
    revenue: {
      today: todayIncome.totalRevenue,
      thisWeek: thisWeekIncome.totalRevenue,
      thisMonth: thisMonthIncome.totalRevenue,
      thisYear: thisYearIncome.totalRevenue,
      total: totalIncome.totalRevenue,
    },
    expenses: {
      today: todayExpenses.totalExpenses,
      thisMonth: thisMonthExpenses.totalExpenses,
    },
    profit: {
      today: todayProfit,
      thisMonth: thisMonthProfit,
    },
    pendingSalaries: salaries.pendingSalaries,
    pendingExpenses: salaries.pendingSalaries + (todayExpenses.byStatus?.PENDING || 0),
  };
};

/**
 * Get income breakdown
 */
export const getIncomeBreakdown = async (startDate, endDate) => {
  const income = await calculateIncome(startDate, endDate);

  // Get monthly trend
  const where = {
    status: 'COMPLETED',
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const payments = await prisma.payment.findMany({
    where,
    select: {
      finalAmount: true,
      createdAt: true,
      courseId: true,
      orderId: true,
    },
  });

  // Monthly trend
  const monthlyTrend = payments.reduce((acc, payment) => {
    const month = new Date(payment.createdAt).toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = 0;
    }
    acc[month] += parseFloat(payment.finalAmount);
    return acc;
  }, {});

  const monthlyTrendArray = Object.entries(monthlyTrend)
    .map(([month, amount]) => ({
      month,
      amount: parseFloat(amount),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    ...income,
    monthlyTrend: monthlyTrendArray,
  };
};

/**
 * Export profit/loss report (returns data in specified format)
 */
export const exportProfitLossReport = async (format, startDate, endDate) => {
  const profitLoss = await calculateProfitLoss(startDate, endDate);

  if (format === 'csv') {
    // Return CSV string
    const rows = [
      ['Profit & Loss Statement', ''],
      ['Period', `${profitLoss.period.startDate || 'All Time'} to ${profitLoss.period.endDate || 'Now'}`],
      [''],
      ['REVENUE', ''],
      ['Course Sales', profitLoss.revenue.courseSales.toFixed(2)],
      ['Product Sales', profitLoss.revenue.productSales.toFixed(2)],
      ['Event Registrations', profitLoss.revenue.eventRegistrations.toFixed(2)],
      ['Total Revenue', profitLoss.revenue.totalRevenue.toFixed(2)],
      [''],
      ['COST OF GOODS SOLD (COGS)', ''],
      ['Instructor Commissions', profitLoss.costOfGoodsSold.instructorCommissions.toFixed(2)],
      ['Affiliate Commissions', profitLoss.costOfGoodsSold.affiliateCommissions.toFixed(2)],
      ['Total COGS', profitLoss.costOfGoodsSold.totalCOGS.toFixed(2)],
      [''],
      ['Gross Profit', profitLoss.grossProfit.toFixed(2)],
      ['Gross Profit Margin', `${profitLoss.grossProfitMargin.toFixed(2)}%`],
      [''],
      ['OPERATING EXPENSES', ''],
      ['Marketing', profitLoss.operatingExpenses.marketing.toFixed(2)],
      ['Infrastructure', profitLoss.operatingExpenses.infrastructure.toFixed(2)],
      ['Software', profitLoss.operatingExpenses.software.toFixed(2)],
      ['Hardware', profitLoss.operatingExpenses.hardware.toFixed(2)],
      ['Office Rent', profitLoss.operatingExpenses.officeRent.toFixed(2)],
      ['Utilities', profitLoss.operatingExpenses.utilities.toFixed(2)],
      ['Insurance', profitLoss.operatingExpenses.insurance.toFixed(2)],
      ['Professional Services', profitLoss.operatingExpenses.professionalServices.toFixed(2)],
      ['Travel', profitLoss.operatingExpenses.travel.toFixed(2)],
      ['Training', profitLoss.operatingExpenses.training.toFixed(2)],
      ['Other', profitLoss.operatingExpenses.other.toFixed(2)],
      ['Total Operating Expenses', profitLoss.operatingExpenses.totalOperatingExpenses.toFixed(2)],
      [''],
      ['NET PROFIT/LOSS', profitLoss.netProfit.toFixed(2)],
      ['Net Profit Margin', `${profitLoss.netProfitMargin.toFixed(2)}%`],
    ];

    return rows.map(row => row.join(',')).join('\n');
  }

  // Default: return JSON
  return profitLoss;
};

/**
 * Get account balance
 */
export const getAccountBalance = async () => {
  const transactions = await prisma.transaction.findMany({
    orderBy: {
      transactionDate: 'desc',
    },
  });

  let balance = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const transaction of transactions) {
    const amount = parseFloat(transaction.amount);

    if (transaction.type === 'INCOME' || transaction.type === 'REFUND') {
      balance += amount;
      totalIncome += amount;
    } else if (transaction.type === 'EXPENSE' || transaction.type === 'SALARY' || transaction.type === 'COMMISSION') {
      balance -= amount;
      totalExpenses += amount;
    }
  }

  return {
    currentBalance: balance,
    totalIncome,
    totalExpenses,
    transactionCount: transactions.length,
  };
};


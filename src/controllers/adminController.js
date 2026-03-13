import { prisma } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as financeService from '../services/financeService.js';
import * as instructorEarningService from '../services/instructorEarningService.js';
import * as expenseService from '../services/expenseService.js';
import { hashPassword } from '../utils/hashPassword.js';

export const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  // Prevent admin from blocking themselves
  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot block your own account',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Prevent blocking other admins
  if (user.role === 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Cannot block admin users',
    });
  }

  if (!user.isActive) {
    return res.status(400).json({
      success: false,
      message: 'User is already blocked',
    });
  }

  // Block user and invalidate refresh token
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      refreshToken: null,
    },
  });

  res.json({
    success: true,
    message: 'User blocked successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isActive: false,
      },
    },
  });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (user.isActive) {
    return res.status(400).json({
      success: false,
      message: 'User is already active',
    });
  }

  // Unblock user
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: true,
    },
  });

  res.json({
    success: true,
    message: 'User unblocked successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isActive: true,
      },
    },
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  const where = {
    ...(search && {
      OR: [
        { email: { contains: search } },
        { fullName: { contains: search } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

/**
 * Admin: create a user with direct credentials (no OTP flow).
 * The created user is marked as email-verified and active so they can login immediately.
 */
export const adminCreateUser = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, role } = req.body;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'A user with this email already exists',
    });
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName,
      phone: phone || null,
      // Default role is USER; only allow explicit AFFILIATE from this endpoint
      ...(role === 'AFFILIATE' ? { role: 'AFFILIATE' } : {}),
      isEmailVerified: true,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      isEmailVerified: true,
      isActive: true,
      createdAt: true,
    },
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user,
    },
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isEmailVerified: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.json({
    success: true,
    data: {
      user,
    },
  });
});

// ==================== DASHBOARD STATISTICS ====================

/**
 * Get dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const financialSummary = await financeService.getFinancialSummary();

  const [usersCount, coursesCount, enrollmentsCount, paymentsCount] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.payment.count({
      where: { status: 'COMPLETED' },
    }),
  ]);

  res.json({
    success: true,
    data: {
      revenue: financialSummary.revenue,
      expenses: financialSummary.expenses,
      profit: financialSummary.profit,
      pendingSalaries: financialSummary.pendingSalaries,
      pendingExpenses: financialSummary.pendingExpenses,
      users: {
        total: usersCount,
      },
      courses: {
        total: coursesCount,
      },
      enrollments: {
        total: enrollmentsCount,
      },
      payments: {
        total: paymentsCount,
      },
    },
  });
});

// ==================== FINANCIAL MANAGEMENT ====================

/**
 * Get financial overview
 */
export const getFinancialOverview = asyncHandler(async (req, res) => {
  const summary = await financeService.getFinancialSummary();

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * Get income breakdown
 */
export const getIncomeBreakdown = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const income = await financeService.getIncomeBreakdown(startDate, endDate);

  res.json({
    success: true,
    data: income,
  });
});

/**
 * Get expense breakdown
 */
export const getExpenseBreakdown = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const expenses = await financeService.calculateExpenses(startDate, endDate);

  res.json({
    success: true,
    data: expenses,
  });
});

/**
 * Get profit/loss statement
 */
export const getProfitLoss = asyncHandler(async (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;

  if (format === 'csv') {
    const csv = await financeService.exportProfitLossReport('csv', startDate, endDate);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=profit-loss-${Date.now()}.csv`);
    return res.send(csv);
  }

  const profitLoss = await financeService.calculateProfitLoss(startDate, endDate);

  res.json({
    success: true,
    data: profitLoss,
  });
});

/**
 * Get salary summary (instructor payments)
 */
export const getSalarySummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, instructorId } = req.query;

  if (instructorId) {
    // Get specific instructor salary summary
    const summary = await instructorEarningService.getInstructorEarningsSummary(
      instructorId,
      { startDate, endDate }
    );

    return res.json({
      success: true,
      data: summary,
    });
  }

  // Get all salaries summary
  const salaries = await financeService.calculateSalaryExpenses(startDate, endDate);

  res.json({
    success: true,
    data: salaries,
  });
});

/**
 * Get all payments (admin view)
 */
export const getAllPayments = asyncHandler(async (req, res) => {
  const {
    status,
    paymentMethod,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    search,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  if (status) {
    where.status = status;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  if (search) {
    where.OR = [
      { transactionId: { contains: search } },
      {
        user: {
          OR: [
            { email: { contains: search } },
            { fullName: { contains: search } },
          ],
        },
      },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: parseInt(limit),
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({
    success: true,
    data: payments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)) || 1,
    },
  });
});

// ==================== INSTRUCTOR EARNINGS ====================

/**
 * Get instructor earnings
 */
export const getInstructorEarnings = asyncHandler(async (req, res) => {
  const {
    instructorId,
    courseId,
    status,
    startDate,
    endDate,
    page,
    limit,
  } = req.query;

  const result = await instructorEarningService.getInstructorEarnings({
    instructorId,
    courseId,
    status,
    startDate,
    endDate,
    page: page || 1,
    limit: limit || 10,
  });

  res.json({
    success: true,
    data: result.earnings,
    pagination: result.pagination,
  });
});

/**
 * Get instructor earnings summary
 */
export const getInstructorEarningsSummary = asyncHandler(async (req, res) => {
  const { instructorId } = req.params;
  const { startDate, endDate } = req.query;

  const summary = await instructorEarningService.getInstructorEarningsSummary(instructorId, {
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * Mark instructor earnings as paid
 */
export const markInstructorEarningsPaid = asyncHandler(async (req, res) => {
  const { earningIds } = req.body;
  const { paidAt, paymentMethod, transactionId, notes } = req.body;

  if (!Array.isArray(earningIds) || earningIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Earning IDs array is required',
    });
  }

  const result = await instructorEarningService.markEarningsAsPaid(earningIds, {
    paidAt,
    paymentMethod,
    transactionId,
    notes,
  });

  res.json({
    success: true,
    message: 'Earnings marked as paid successfully',
    data: result,
  });
});

/**
 * Update instructor commission rate
 */
export const updateInstructorCommissionRate = asyncHandler(async (req, res) => {
  const { instructorId } = req.params;
  const { commissionRate } = req.body;

  if (!commissionRate || isNaN(parseFloat(commissionRate))) {
    return res.status(400).json({
      success: false,
      message: 'Valid commission rate is required',
    });
  }

  const instructor = await instructorEarningService.updateInstructorCommissionRate(
    instructorId,
    commissionRate
  );

  res.json({
    success: true,
    message: 'Commission rate updated successfully',
    data: instructor,
  });
});

// ==================== ACCOUNT MANAGEMENT ====================

/**
 * Get account overview
 */
export const getAccountOverview = asyncHandler(async (req, res) => {
  const balance = await financeService.getAccountBalance();

  // Get recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    take: 10,
    orderBy: {
      transactionDate: 'desc',
    },
    include: {
      payment: {
        select: {
          id: true,
          finalAmount: true,
          status: true,
        },
      },
      expense: {
        select: {
          id: true,
          title: true,
          amount: true,
        },
      },
      instructorEarning: {
        select: {
          id: true,
          amount: true,
          instructor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      balance,
      recentTransactions,
    },
  });
});

/**
 * Get all transactions (ledger)
 */
export const getAllTransactions = asyncHandler(async (req, res) => {
  const {
    type,
    category,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  if (type) {
    where.type = type;
  }

  if (category) {
    where.category = category;
  }

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) {
      where.transactionDate.gte = new Date(startDate);
    }
    if (endDate) {
      where.transactionDate.lte = new Date(endDate);
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        payment: {
          select: {
            id: true,
            finalAmount: true,
            status: true,
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
        expense: {
          select: {
            id: true,
            title: true,
            amount: true,
          },
        },
        instructorEarning: {
          select: {
            id: true,
            amount: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
      skip,
      take: parseInt(limit),
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)) || 1,
    },
  });
});

/**
 * Get account balance
 */
export const getAccountBalance = asyncHandler(async (req, res) => {
  const balance = await financeService.getAccountBalance();

  res.json({
    success: true,
    data: balance,
  });
});

/**
 * Get account statement
 */
export const getAccountStatement = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) {
      where.transactionDate.gte = new Date(startDate);
    }
    if (endDate) {
      where.transactionDate.lte = new Date(endDate);
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      payment: {
        select: {
          id: true,
          finalAmount: true,
          status: true,
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      },
      expense: {
        select: {
          id: true,
          title: true,
          amount: true,
        },
      },
      instructorEarning: {
        select: {
          id: true,
          amount: true,
          instructor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      transactionDate: 'desc',
    },
  });

  let runningBalance = 0;
  const statement = transactions.map((transaction) => {
    const amount = parseFloat(transaction.amount);

    if (transaction.type === 'INCOME' || transaction.type === 'REFUND') {
      runningBalance += amount;
    } else {
      runningBalance -= amount;
    }

    return {
      ...transaction,
      runningBalance,
    };
  });

  const finalBalance = runningBalance;

  res.json({
    success: true,
    data: {
      statement,
      openingBalance: finalBalance - transactions.reduce((sum, t) => {
        const amt = parseFloat(t.amount);
        return sum + (t.type === 'INCOME' || t.type === 'REFUND' ? amt : -amt);
      }, 0),
      closingBalance: finalBalance,
      transactionCount: transactions.length,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    },
  });
});

/**
 * Create manual salary payment (creates expense + updates instructor)
 */
export const createManualSalaryPayment = asyncHandler(async (req, res) => {
  const { instructorId, amount, paymentDate, description, paymentMethod } = req.body;

  if (!instructorId || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Instructor ID and amount are required',
    });
  }

  // Verify instructor exists
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    select: { id: true, name: true },
  });

  if (!instructor) {
    return res.status(404).json({
      success: false,
      message: 'Instructor not found',
    });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid amount',
    });
  }

  // Create expense entry for this salary payment
  const expense = await prisma.expense.create({
    data: {
      title: `Salary Payment - ${instructor.name}`,
      description: description || `Manual salary payment for ${instructor.name}`,
      amount: parsedAmount,
      category: 'SALARY',
      status: 'PAID',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      instructorId: instructorId,
    },
  });

  // Create instructor earning record so it shows in salary section
  const earning = await prisma.instructorEarning.create({
    data: {
      instructor: {
        connect: { id: instructorId },
      },
      amount: parsedAmount,
      commissionRate: 0, // Manual payment, not commission-based
      status: 'PAID',
      paidAt: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'BANK_TRANSFER',
      notes: description || `Manual salary payment`,
    },
  });

  // Create transaction record
  await prisma.transaction.create({
    data: {
      type: 'SALARY',
      category: 'OPERATIONAL',
      amount: parsedAmount,
      description: expense.title,
      transactionDate: expense.paymentDate,
      expenseId: expense.id,
      instructorEarningId: earning.id,
    },
  });

  // Update instructor's earnings (both total and paid)
  await prisma.instructor.update({
    where: { id: instructorId },
    data: {
      totalEarnings: {
        increment: parsedAmount,
      },
      paidEarnings: {
        increment: parsedAmount,
      },
    },
  });

  res.json({
    success: true,
    message: 'Salary payment created and recorded as expense',
    data: {
      expense,
      earning,
      instructor: {
        id: instructor.id,
        name: instructor.name,
      },
      amount: parsedAmount,
      paymentDate: expense.paymentDate,
    },
  });
});


import { prisma } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as financeService from '../services/financeService.js';
import * as instructorEarningService from '../services/instructorEarningService.js';
import * as expenseService from '../services/expenseService.js';
import { hashPassword } from '../utils/hashPassword.js';
import { generateSlug } from '../utils/helpers.js';

const SOFT_DELETE_EMAIL_DOMAIN = '@deleted.local';
//soft del

const isSoftDeletedEmail = (email) =>
  typeof email === 'string' &&
  email.toLowerCase().startsWith('deleted+') &&
  email.toLowerCase().endsWith(SOFT_DELETE_EMAIL_DOMAIN);

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

  if (isSoftDeletedEmail(user.email)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot block a deleted user',
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

  if (isSoftDeletedEmail(user.email)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot unblock a deleted user',
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
    // Soft-deleted users are hidden from admin list.
    email: {
      not: {
        endsWith: SOFT_DELETE_EMAIL_DOMAIN,
      },
    },
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
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
        phone: true,
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

  const emails = users
    .map((u) => u.email?.trim().toLowerCase())
    .filter(Boolean);

  const instructorRows = emails.length
    ? await prisma.instructor.findMany({
      where: {
        OR: emails.map((email) => ({
          email: { equals: email, mode: 'insensitive' },
        })),
      },
      select: { email: true },
    })
    : [];

  const instructorEmailSet = new Set(
    instructorRows
      .map((i) => i.email?.trim().toLowerCase())
      .filter(Boolean)
  );

  const usersWithDisplayRole = users.map((u) => ({
    ...u,
    role:
      u.role === 'ADMIN'
        ? 'ADMIN'
        : (instructorEmailSet.has((u.email || '').trim().toLowerCase()) ? 'INSTRUCTOR' : u.role),
  }));

  res.json({
    success: true,
    data: {
      users: usersWithDisplayRole,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

const MAX_USERS_ENROLLMENT_EXPORT = 5000;

function csvEscapeCell(val) {
  const s = val == null ? '' : String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

function formatMoneyExport(v) {
  if (v == null || v === '') return '';
  try {
    const n = typeof v === 'object' && v !== null && typeof v.toNumber === 'function' ? v.toNumber() : Number(v);
    if (Number.isNaN(n)) return '';
    return n.toFixed(2);
  } catch {
    return '';
  }
}

function formatDateExport(d) {
  if (!d) return '';
  try {
    return new Date(d).toISOString();
  } catch {
    return '';
  }
}

/**
 * Admin CSV: one row per enrollment (user columns repeated), plus users with no enrollments as a single sparse row.
 * Includes installments, completed payment sums, and balance vs net payable (when net payable is set).
 */
export const exportUsersEnrollmentsDetailCsv = asyncHandler(async (req, res) => {
  const search = (req.query.search || '').trim();

  const baseWhere = {
    email: {
      not: {
        endsWith: SOFT_DELETE_EMAIL_DOMAIN,
      },
    },
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const total = await prisma.user.count({ where: baseWhere });
  if (total > MAX_USERS_ENROLLMENT_EXPORT) {
    return res.status(400).json({
      success: false,
      message: `Too many users (${total}) for one export. Narrow search (max ${MAX_USERS_ENROLLMENT_EXPORT} users).`,
    });
  }

  const users = await prisma.user.findMany({
    where: baseWhere,
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      createdAt: true,
      enrollments: {
        include: {
          course: {
            select: { id: true, title: true, slug: true, price: true, isFree: true },
          },
          coupon: { select: { code: true, description: true } },
          installments: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const userIds = users.map((u) => u.id);
  const payments =
    userIds.length > 0
      ? await prisma.payment.findMany({
          where: {
            userId: { in: userIds },
            courseId: { not: null },
          },
          select: {
            userId: true,
            courseId: true,
            status: true,
            finalAmount: true,
            discount: true,
          },
        })
      : [];

  const payMap = new Map();
  for (const p of payments) {
    const k = `${p.userId}|${p.courseId}`;
    if (!payMap.has(k)) payMap.set(k, []);
    payMap.get(k).push(p);
  }

  const headers = [
    'user_id',
    'user_email',
    'user_full_name',
    'user_phone',
    'user_role',
    'user_active',
    'user_email_verified',
    'user_joined_at',
    'enrollment_id',
    'course_id',
    'course_title',
    'course_slug',
    'course_list_price',
    'course_is_free',
    'enrollment_status',
    'enrollment_progress_pct',
    'enrollment_completed_at',
    'access_type',
    'access_expires_at',
    'admin_granted',
    'admin_notes',
    'coupon_code_description',
    'admin_discount_amount',
    'net_payable_after_discount',
    'price_paid_on_enrollment',
    'payments_completed_count',
    'payments_completed_sum_final',
    'payments_completed_sum_discount',
    'installment_count',
    'installment_schedule_total',
    'installment_paid_sum',
    'installment_unpaid_sum',
    'balance_vs_completed_payments',
    'installment_details',
  ];

  const emptyEnrollmentCols = () =>
    Array.from({ length: headers.length - 8 }, () => '');

  const rows = [];

  for (const u of users) {
    const base = [
      u.id,
      u.email,
      u.fullName,
      u.phone ?? '',
      u.role,
      u.isActive ? 'Yes' : 'No',
      u.isEmailVerified ? 'Yes' : 'No',
      formatDateExport(u.createdAt),
    ];

    if (!u.enrollments.length) {
      rows.push([...base, ...emptyEnrollmentCols()]);
      continue;
    }

    for (const e of u.enrollments) {
      const key = `${u.id}|${e.courseId}`;
      const pList = payMap.get(key) || [];
      const completed = pList.filter((p) => p.status === 'COMPLETED');
      const sumFinal = completed.reduce((acc, p) => acc + Number(p.finalAmount), 0);
      const sumDisc = completed.reduce((acc, p) => acc + Number(p.discount), 0);
      const inst = e.installments || [];
      const instTotal = inst.reduce((acc, i) => acc + Number(i.amount), 0);
      const instPaid = inst.filter((i) => i.status === 'PAID').reduce((acc, i) => acc + Number(i.amount), 0);
      const instUnpaid = Math.max(0, instTotal - instPaid);

      const netRaw = e.netPayableAfterDiscount;
      const netNum = netRaw != null ? Number(netRaw) : null;
      const listPriceNum = e.course.isFree ? 0 : Number(e.course.price);
      const effectiveNet = netNum != null && !Number.isNaN(netNum) ? netNum : listPriceNum;
      const balance =
        !Number.isNaN(effectiveNet) ? (effectiveNet - sumFinal).toFixed(2) : '';

      const couponLabel = e.coupon
        ? [e.coupon.code, e.coupon.description].filter(Boolean).join(' / ')
        : '';

      const instDetails = inst
        .map((i) => {
          const paid = i.paidAt ? `:paidAt=${formatDateExport(i.paidAt)}` : '';
          return `#${i.installmentNumber}:${formatMoneyExport(i.amount)}:${i.status}:${formatDateExport(i.dueDate)}${paid}`;
        })
        .join(' | ');

      rows.push([
        ...base,
        e.id,
        e.course.id,
        e.course.title,
        e.course.slug,
        formatMoneyExport(e.course.price),
        e.course.isFree ? 'Yes' : 'No',
        e.status,
        String(e.progress ?? 0),
        formatDateExport(e.completedAt),
        e.accessType ?? '',
        formatDateExport(e.accessExpiresAt),
        e.grantedByAdmin ? 'Yes' : 'No',
        (e.adminNotes ?? '').replace(/\r?\n/g, ' ').slice(0, 2000),
        couponLabel,
        formatMoneyExport(e.adminDiscountAmount),
        formatMoneyExport(e.netPayableAfterDiscount),
        formatMoneyExport(e.pricePaid),
        String(completed.length),
        sumFinal.toFixed(2),
        sumDisc.toFixed(2),
        String(inst.length),
        instTotal.toFixed(2),
        instPaid.toFixed(2),
        instUnpaid.toFixed(2),
        balance,
        instDetails,
      ]);
    }
  }

  const csvLines = [headers.map(csvEscapeCell).join(','), ...rows.map((r) => r.map(csvEscapeCell).join(','))];
  const csv = `\ufeff${csvLines.join('\r\n')}`;
  const fname = `user-enrollments-detail-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  res.send(csv);
});

/**
 * Admin: create a user with direct credentials (no OTP flow).
 * The created user is marked as email-verified and active so they can login immediately.
 */
export const adminCreateUser = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, role } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'A user with this email already exists',
    });
  }

  const hashedPassword = await hashPassword(password);

  const normalizedRequestedRole = String(role || 'STUDENT').toUpperCase();
  const shouldCreateInstructorProfile = normalizedRequestedRole === 'INSTRUCTOR';

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      fullName,
      phone: phone || null,
      ...(normalizedRequestedRole === 'ADMIN' ? { role: 'ADMIN' } : {}),
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

  if (shouldCreateInstructorProfile) {
    const existingInstructorByEmail = await prisma.instructor.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true },
    });

    if (!existingInstructorByEmail) {
      const baseSlug = generateSlug(fullName || normalizedEmail.split('@')[0] || 'instructor');
      let slug = baseSlug || `instructor-${Date.now()}`;
      let suffix = 1;

      while (await prisma.instructor.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${baseSlug}-${suffix++}`;
      }

      await prisma.instructor.create({
        data: {
          name: fullName,
          slug,
          email: normalizedEmail,
          phone: phone || null,
        },
      });
    }
  }

  const responseUser = {
    ...user,
    role: shouldCreateInstructorProfile ? 'INSTRUCTOR' : user.role,
  };

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: responseUser,
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

  if (!user || isSoftDeletedEmail(user.email)) {
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

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  if (!user || isSoftDeletedEmail(user.email)) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (user.role === 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Cannot delete admin users',
    });
  }

  // Soft delete strategy:
  // - Keep relational records (orders/payments/enrollments/etc.) intact.
  // - Make account unusable and anonymize personally identifiable fields.
  const anonymizedEmail = `deleted+${user.id}${SOFT_DELETE_EMAIL_DOMAIN}`;
  const deletedPassword = await hashPassword(`deleted-user-${user.id}-${Date.now()}`);

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: anonymizedEmail,
      fullName: 'Deleted User',
      phone: null,
      profileImage: null,
      googleId: null,
      refreshToken: null,
      password: deletedPassword,
      preferredPaymentMethod: null,
      isEmailVerified: false,
      isActive: false,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    },
  });

  res.json({
    success: true,
    message: 'User deleted successfully',
    data: {
      id: userId,
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


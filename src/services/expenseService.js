import { prisma } from '../config/database.js';

/**
 * Create expense
 */
export const createExpense = async (expenseData, userId) => {
  const expense = await prisma.expense.create({
    data: {
      title: expenseData.title,
      description: expenseData.description || null,
      amount: parseFloat(expenseData.amount),
      category: expenseData.category,
      status: expenseData.status || 'PENDING',
      instructorId: expenseData.instructorId || null,
      courseId: expenseData.courseId || null,
      paymentDate: expenseData.paymentDate ? new Date(expenseData.paymentDate) : null,
      paymentMethod: expenseData.paymentMethod || null,
      receiptUrl: expenseData.receiptUrl || null,
      invoiceNumber: expenseData.invoiceNumber || null,
      submittedBy: userId || null,
    },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
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

  // Create transaction record
  await prisma.transaction.create({
    data: {
      type: 'EXPENSE',
      category: mapExpenseCategoryToTransactionCategory(expenseData.category),
      amount: parseFloat(expenseData.amount),
      description: expenseData.title,
      expenseId: expense.id,
      transactionDate: new Date(),
    },
  });

  return expense;
};

/**
 * Get expenses with filters
 */
export const getExpenses = async (filters = {}) => {
  const {
    category,
    status,
    instructorId,
    courseId,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    search,
  } = filters;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  if (category) {
    where.category = category;
  }

  if (status) {
    where.status = status;
  }

  if (instructorId) {
    where.instructorId = instructorId;
  }

  if (courseId) {
    where.courseId = courseId;
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
      { title: { contains: search } },
      { description: { contains: search } },
      { invoiceNumber: { contains: search } },
    ];
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
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
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: parseInt(limit),
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    expenses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)) || 1,
    },
  };
};

/**
 * Get expense by ID
 */
export const getExpenseById = async (id) => {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      transactions: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  return expense;
};

/**
 * Update expense
 */
export const updateExpense = async (id, expenseData) => {
  const updateData = {};

  if (expenseData.title !== undefined) {
    updateData.title = expenseData.title;
  }
  if (expenseData.description !== undefined) {
    updateData.description = expenseData.description;
  }
  if (expenseData.amount !== undefined) {
    updateData.amount = parseFloat(expenseData.amount);
  }
  if (expenseData.category !== undefined) {
    updateData.category = expenseData.category;
  }
  if (expenseData.instructorId !== undefined) {
    updateData.instructorId = expenseData.instructorId || null;
  }
  if (expenseData.courseId !== undefined) {
    updateData.courseId = expenseData.courseId || null;
  }
  if (expenseData.paymentDate !== undefined) {
    updateData.paymentDate = expenseData.paymentDate ? new Date(expenseData.paymentDate) : null;
  }
  if (expenseData.paymentMethod !== undefined) {
    updateData.paymentMethod = expenseData.paymentMethod;
  }
  if (expenseData.receiptUrl !== undefined) {
    updateData.receiptUrl = expenseData.receiptUrl;
  }
  if (expenseData.invoiceNumber !== undefined) {
    updateData.invoiceNumber = expenseData.invoiceNumber;
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: updateData,
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
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

  return expense;
};

/**
 * Delete expense
 */
export const deleteExpense = async (id) => {
  // Delete related transactions first
  await prisma.transaction.deleteMany({
    where: { expenseId: id },
  });

  await prisma.expense.delete({
    where: { id },
  });

  return true;
};

/**
 * Approve expense
 */
export const approveExpense = async (id, userId) => {
  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.status === 'APPROVED') {
    throw new Error('Expense is already approved');
  }

  if (expense.status === 'REJECTED') {
    throw new Error('Cannot approve a rejected expense');
  }

  const updatedExpense = await prisma.expense.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
    },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
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

  return updatedExpense;
};

/**
 * Reject expense
 */
export const rejectExpense = async (id, userId, reason) => {
  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.status === 'REJECTED') {
    throw new Error('Expense is already rejected');
  }

  if (expense.status === 'PAID') {
    throw new Error('Cannot reject a paid expense');
  }

  const updatedExpense = await prisma.expense.update({
    where: { id },
    data: {
      status: 'REJECTED',
      approvedBy: userId,
      approvedAt: new Date(),
      rejectedReason: reason || null,
    },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
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

  return updatedExpense;
};

/**
 * Mark expense as paid
 */
export const markExpenseAsPaid = async (id, paymentData) => {
  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.status !== 'APPROVED') {
    throw new Error('Expense must be approved before marking as paid');
  }

  if (expense.status === 'PAID') {
    throw new Error('Expense is already marked as paid');
  }

  const updatedExpense = await prisma.expense.update({
    where: { id },
    data: {
      status: 'PAID',
      paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
      paymentMethod: paymentData.paymentMethod || null,
      receiptUrl: paymentData.receiptUrl || expense.receiptUrl,
    },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
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

  return updatedExpense;
};

/**
 * Get expense statistics
 */
export const getExpenseStatistics = async (filters = {}) => {
  const { startDate, endDate } = filters;

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

  const expenses = await prisma.expense.findMany({
    where,
  });

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  // Group by category
  const byCategory = expenses.reduce((acc, exp) => {
    const category = exp.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += parseFloat(exp.amount);
    return acc;
  }, {});

  // Group by status
  const byStatus = expenses.reduce((acc, exp) => {
    const status = exp.status;
    if (!acc[status]) {
      acc[status] = 0;
    }
    acc[status] += parseFloat(exp.amount);
    return acc;
  }, {});

  // Monthly trend
  const monthlyTrend = expenses.reduce((acc, exp) => {
    const month = new Date(exp.createdAt).toISOString().substring(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = 0;
    }
    acc[month] += parseFloat(exp.amount);
    return acc;
  }, {});

  const monthlyTrendArray = Object.entries(monthlyTrend)
    .map(([month, amount]) => ({
      month,
      amount: parseFloat(amount),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalExpenses,
    byCategory,
    byStatus,
    monthlyTrend: monthlyTrendArray,
    count: expenses.length,
  };
};

/**
 * Map expense category to transaction category
 */
const mapExpenseCategoryToTransactionCategory = (expenseCategory) => {
  const mapping = {
    MARKETING: 'MARKETING',
    SALARY: 'OPERATIONAL',
    INFRASTRUCTURE: 'INFRASTRUCTURE',
    SOFTWARE: 'OPERATIONAL',
    HARDWARE: 'OPERATIONAL',
    OFFICE_RENT: 'OPERATIONAL',
    UTILITIES: 'OPERATIONAL',
    INSURANCE: 'OPERATIONAL',
    PROFESSIONAL_SERVICES: 'OPERATIONAL',
    TRAVEL: 'OPERATIONAL',
    TRAINING: 'OPERATIONAL',
    OTHER: 'OPERATIONAL',
  };

  // Ensure we return a valid TransactionCategory enum value
  const category = mapping[expenseCategory] || 'OPERATIONAL';
  // Valid TransactionCategory values: COURSE_SALE, PRODUCT_SALE, INSTRUCTOR_COMMISSION, AFFILIATE_COMMISSION, MARKETING, OPERATIONAL, INFRASTRUCTURE
  if (!['COURSE_SALE', 'PRODUCT_SALE', 'INSTRUCTOR_COMMISSION', 'AFFILIATE_COMMISSION', 'MARKETING', 'OPERATIONAL', 'INFRASTRUCTURE'].includes(category)) {
    return 'OPERATIONAL';
  }
  return category;
};


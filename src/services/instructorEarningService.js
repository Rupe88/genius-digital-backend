import { prisma } from '../config/database.js';

/**
 * Calculate and create instructor commission for an enrollment
 */
export const calculateCommission = async (instructorId, courseId, paymentId, enrollmentId, amount) => {
  // Get instructor
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
  });

  if (!instructor) {
    throw new Error('Instructor not found');
  }

  // Calculate commission
  const commissionRate = parseFloat(instructor.commissionRate) || 30.0;
  const commissionAmount = (parseFloat(amount) * commissionRate) / 100;

  // Create instructor earning
  const earning = await prisma.instructorEarning.create({
    data: {
      instructorId,
      courseId,
      paymentId,
      enrollmentId,
      amount: commissionAmount,
      commissionRate,
      status: 'PENDING',
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
      payment: {
        select: {
          id: true,
          amount: true,
          finalAmount: true,
        },
      },
    },
  });

  // Update instructor totals
  await prisma.instructor.update({
    where: { id: instructorId },
    data: {
      pendingEarnings: {
        increment: commissionAmount,
      },
      totalEarnings: {
        increment: commissionAmount,
      },
    },
  });

  // Create transaction record
  await prisma.transaction.create({
    data: {
      type: 'COMMISSION',
      category: 'INSTRUCTOR_COMMISSION',
      amount: commissionAmount,
      description: `Instructor commission for course: ${earning.course.title}`,
      instructorEarningId: earning.id,
      paymentId: paymentId,
      transactionDate: new Date(),
    },
  });

  return earning;
};

/**
 * Get instructor earnings with filters
 */
export const getInstructorEarnings = async (filters = {}) => {
  const {
    instructorId,
    courseId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = filters;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  if (instructorId) {
    where.instructorId = instructorId;
  }

  if (courseId) {
    where.courseId = courseId;
  }

  if (status) {
    where.status = status;
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

  if (!prisma || !prisma.instructorEarning) {
    throw new Error('Prisma client not initialized properly');
  }

  const [earnings, total] = await Promise.all([
    prisma.instructorEarning.findMany({
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
            price: true,
          },
        },
        payment: {
          select: {
            id: true,
            finalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            createdAt: true,
          },
          required: false,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: parseInt(limit),
    }),
    prisma.instructorEarning.count({ where }),
  ]);

  return {
    earnings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)) || 1,
    },
  };
};

/**
 * Get earnings for a specific instructor
 */
export const getInstructorEarningsByInstructor = async (instructorId, filters = {}) => {
  return getInstructorEarnings({
    ...filters,
    instructorId,
  });
};

/**
 * Mark earnings as paid (batch)
 */
export const markEarningsAsPaid = async (earningIds, paymentData = {}) => {
  const earnings = await prisma.instructorEarning.findMany({
    where: {
      id: { in: earningIds },
      status: 'PENDING',
    },
    include: {
      instructor: true,
    },
  });

  if (earnings.length === 0) {
    throw new Error('No pending earnings found');
  }

  const paidAt = paymentData.paidAt ? new Date(paymentData.paidAt) : new Date();
  let totalPaid = 0;

  // Group by instructor for batch updates
  const instructorUpdates = {};

  for (const earning of earnings) {
    const instructorId = earning.instructorId;
    if (!instructorUpdates[instructorId]) {
      instructorUpdates[instructorId] = {
        pending: 0,
        paid: 0,
      };
    }
    instructorUpdates[instructorId].pending += parseFloat(earning.amount);
    instructorUpdates[instructorId].paid += parseFloat(earning.amount);
    totalPaid += parseFloat(earning.amount);
  }

  // Update earnings
  await prisma.instructorEarning.updateMany({
    where: {
      id: { in: earningIds },
      status: 'PENDING',
    },
    data: {
      status: 'PAID',
      paidAt,
      paymentMethod: paymentData.paymentMethod || null,
      transactionId: paymentData.transactionId || null,
      notes: paymentData.notes || null,
    },
  });

  // Update instructor totals
  for (const [instructorId, amounts] of Object.entries(instructorUpdates)) {
    await prisma.instructor.update({
      where: { id: instructorId },
      data: {
        pendingEarnings: {
          decrement: amounts.pending,
        },
        paidEarnings: {
          increment: amounts.paid,
        },
      },
    });
  }

  // Get updated earnings
  const updatedEarnings = await prisma.instructorEarning.findMany({
    where: {
      id: { in: earningIds },
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

  // Create transaction records for payments
  for (const earning of updatedEarnings) {
    await prisma.transaction.create({
      data: {
        type: 'SALARY',
        category: 'INSTRUCTOR_COMMISSION',
        amount: parseFloat(earning.amount),
        description: `Salary payment for instructor: ${earning.instructor.name}`,
        instructorEarningId: earning.id,
        transactionDate: paidAt,
        referenceNumber: paymentData.transactionId || null,
      },
    });
  }

  return {
    earningsUpdated: updatedEarnings.length,
    totalAmount: totalPaid,
    earnings: updatedEarnings,
  };
};

/**
 * Get instructor earnings summary
 */
export const getInstructorEarningsSummary = async (instructorId, filters = {}) => {
  const { startDate, endDate } = filters;

  const where = {
    instructorId,
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

  const earnings = await prisma.instructorEarning.findMany({
    where,
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const summary = {
    totalEarnings: 0,
    paidEarnings: 0,
    pendingEarnings: 0,
    earningsByStatus: {
      PENDING: 0,
      PAID: 0,
      CANCELLED: 0,
    },
    earningsByCourse: {},
  };

  for (const earning of earnings) {
    const amount = parseFloat(earning.amount);
    summary.totalEarnings += amount;

    if (earning.status === 'PAID') {
      summary.paidEarnings += amount;
    } else if (earning.status === 'PENDING') {
      summary.pendingEarnings += amount;
    }

    summary.earningsByStatus[earning.status] = (summary.earningsByStatus[earning.status] || 0) + amount;

    const courseId = earning.course.id;
    if (!summary.earningsByCourse[courseId]) {
      summary.earningsByCourse[courseId] = {
        courseTitle: earning.course.title,
        total: 0,
        count: 0,
      };
    }
    summary.earningsByCourse[courseId].total += amount;
    summary.earningsByCourse[courseId].count += 1;
  }

  // Get instructor info
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    select: {
      id: true,
      name: true,
      email: true,
      commissionRate: true,
      totalEarnings: true,
      paidEarnings: true,
      pendingEarnings: true,
    },
  });

  return {
    instructor,
    summary: {
      totalEarnings: summary.totalEarnings,
      paidEarnings: summary.paidEarnings,
      pendingEarnings: summary.pendingEarnings,
      earningsByStatus: summary.earningsByStatus,
      earningsByCourse: Object.values(summary.earningsByCourse),
      commissionRate: parseFloat(instructor.commissionRate),
    },
  };
};

/**
 * Update instructor commission rate
 */
export const updateInstructorCommissionRate = async (instructorId, commissionRate) => {
  const rate = parseFloat(commissionRate);

  if (rate < 0 || rate > 100) {
    throw new Error('Commission rate must be between 0 and 100');
  }

  const instructor = await prisma.instructor.update({
    where: { id: instructorId },
    data: {
      commissionRate: rate,
    },
    select: {
      id: true,
      name: true,
      email: true,
      commissionRate: true,
      totalEarnings: true,
      paidEarnings: true,
      pendingEarnings: true,
    },
  });

  return instructor;
};

/**
 * Cancel instructor earning (e.g., if payment was refunded)
 */
export const cancelEarning = async (earningId) => {
  const earning = await prisma.instructorEarning.findUnique({
    where: { id: earningId },
    include: {
      instructor: true,
    },
  });

  if (!earning) {
    throw new Error('Earning not found');
  }

  if (earning.status === 'CANCELLED') {
    throw new Error('Earning is already cancelled');
  }

  const amount = parseFloat(earning.amount);
  let updateData = {};

  // If already paid, reduce paid earnings
  if (earning.status === 'PAID') {
    updateData = {
      pendingEarnings: {
        decrement: 0, // No change to pending
      },
      paidEarnings: {
        decrement: amount,
      },
      totalEarnings: {
        decrement: amount,
      },
    };
  } else if (earning.status === 'PENDING') {
    // If pending, reduce pending and total
    updateData = {
      pendingEarnings: {
        decrement: amount,
      },
      totalEarnings: {
        decrement: amount,
      },
    };
  }

  // Update instructor totals
  if (Object.keys(updateData).length > 0) {
    await prisma.instructor.update({
      where: { id: earning.instructorId },
      data: updateData,
    });
  }

  // Update earning status
  const cancelledEarning = await prisma.instructorEarning.update({
    where: { id: earningId },
    data: {
      status: 'CANCELLED',
    },
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

  return cancelledEarning;
};


import { prisma } from '../config/database.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Get active installment plan for a course (public/course page)
 */
export const getPlanByCourseId = async (courseId) => {
  const plan = await prisma.courseInstallmentPlan.findFirst({
    where: { courseId, isActive: true },
  });
  return plan;
};

/**
 * Get plan with course (for admin)
 */
export const getPlanByCourseIdAdmin = async (courseId) => {
  return prisma.courseInstallmentPlan.findUnique({
    where: { courseId },
    include: { course: { select: { id: true, title: true, price: true } } },
  });
};

/**
 * Create or update installment plan for a course (admin)
 */
export const upsertPlan = async (courseId, data) => {
  const { numberOfInstallments, intervalMonths, minAmountForPlan, isActive } = data;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, price: true },
  });
  if (!course) throw new Error('Course not found');

  const payload = {
    numberOfInstallments: Math.max(1, Math.min(12, numberOfInstallments ?? 3)),
    intervalMonths: Math.max(1, Math.min(12, intervalMonths ?? 1)),
    minAmountForPlan: minAmountForPlan != null ? new Decimal(minAmountForPlan) : null,
    isActive: isActive !== false,
  };

  return prisma.courseInstallmentPlan.upsert({
    where: { courseId },
    create: { courseId, ...payload },
    update: payload,
    include: { course: { select: { id: true, title: true, price: true } } },
  });
};

/**
 * Delete installment plan (admin)
 */
export const deletePlan = async (courseId) => {
  await prisma.courseInstallmentPlan.deleteMany({ where: { courseId } });
  return { deleted: true };
};

/**
 * Start installment enrollment: create enrollment + all installment rows; return schedule and first installment id
 */
export const startInstallmentEnrollment = async (userId, courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { installmentPlan: true },
  });
  if (!course) throw new Error('Course not found');
  if (!course.installmentPlan?.isActive) throw new Error('This course does not offer installments');

  const price = Number(course.price);
  if (price <= 0) throw new Error('Course has no price');

  const n = course.installmentPlan.numberOfInstallments;
  const intervalMonths = course.installmentPlan.intervalMonths || 1;

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: { installments: true },
  });
  if (existing) throw new Error('You are already enrolled in this course');

  const amountPerInstallment = Math.ceil((price * 100) / n) / 100;
  const installments = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const due = new Date(now);
    due.setMonth(due.getMonth() + (i * intervalMonths));
    const amt = i === n - 1 ? price - amountPerInstallment * (n - 1) : amountPerInstallment;
    installments.push({
      installmentNumber: i + 1,
      amount: new Decimal(amt),
      dueDate: due,
      status: 'PENDING',
    });
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: 'ACTIVE',
      amountPaid: new Decimal(0),
      installments: { create: installments },
    },
    include: {
      course: { select: { id: true, title: true, price: true } },
      installments: { orderBy: { installmentNumber: 'asc' } },
    },
  });

  const first = enrollment.installments[0];
  return {
    enrollmentId: enrollment.id,
    course: enrollment.course,
    schedule: enrollment.installments.map((i) => ({
      id: i.id,
      installmentNumber: i.installmentNumber,
      amount: Number(i.amount),
      dueDate: i.dueDate,
      status: i.status,
    })),
    firstInstallmentId: first.id,
    firstAmount: Number(first.amount),
  };
};

/**
 * Get current user's installments (all or filter by status)
 */
export const getMyInstallments = async (userId, options = {}) => {
  const { status, courseId } = options;
  const where = {
    enrollment: { userId },
  };
  if (status) where.status = status;
  if (courseId) where.enrollment = { ...where.enrollment, courseId };

  const installments = await prisma.courseInstallment.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
    include: {
      enrollment: {
        include: {
          course: { select: { id: true, title: true, thumbnail: true, slug: true } },
        },
      },
    },
  });

  const now = new Date();
  return installments.map((i) => {
    let status = i.status;
    if (status === 'PENDING' && new Date(i.dueDate) < now) status = 'OVERDUE';
    return {
      id: i.id,
      installmentNumber: i.installmentNumber,
      amount: Number(i.amount),
      dueDate: i.dueDate,
      status,
      paidAt: i.paidAt,
      course: i.enrollment.course,
      enrollmentId: i.enrollmentId,
    };
  });
};

/**
 * Get one installment by id; ensure it belongs to user and is PENDING (for "Pay now")
 */
export const getInstallmentForPayment = async (installmentId, userId) => {
  const installment = await prisma.courseInstallment.findFirst({
    where: {
      id: installmentId,
      enrollment: { userId },
    },
    include: {
      enrollment: {
        include: { course: { select: { id: true, title: true } } },
      },
    },
  });
  if (!installment) return null;
  if (installment.status !== 'PENDING' && installment.status !== 'OVERDUE') return null;
  return installment;
};

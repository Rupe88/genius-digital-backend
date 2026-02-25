import * as installmentService from '../services/installmentService.js';

/**
 * Get installment plan for a course (public – used on course page)
 */
export const getPlanByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const plan = await installmentService.getPlanByCourseId(courseId);
    if (!plan) {
      return res.json({ success: true, data: null });
    }
    res.json({
      success: true,
      data: {
        id: plan.id,
        courseId: plan.courseId,
        numberOfInstallments: plan.numberOfInstallments,
        intervalMonths: plan.intervalMonths,
        minAmountForPlan: plan.minAmountForPlan != null ? Number(plan.minAmountForPlan) : null,
        isActive: plan.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: get plan for course
 */
export const getPlanByCourseAdmin = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const plan = await installmentService.getPlanByCourseIdAdmin(courseId);
    if (!plan) {
      return res.json({ success: true, data: null });
    }
    res.json({
      success: true,
      data: {
        ...plan,
        minAmountForPlan: plan.minAmountForPlan != null ? Number(plan.minAmountForPlan) : null,
        course: plan.course && { ...plan.course, price: plan.course.price != null ? Number(plan.course.price) : null },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: create or update installment plan
 */
export const upsertPlan = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { numberOfInstallments, intervalMonths, minAmountForPlan, isActive } = req.body;
    const plan = await installmentService.upsertPlan(courseId, {
      numberOfInstallments,
      intervalMonths,
      minAmountForPlan,
      isActive,
    });
    res.json({
      success: true,
      data: {
        ...plan,
        minAmountForPlan: plan.minAmountForPlan != null ? Number(plan.minAmountForPlan) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: delete installment plan
 */
export const deletePlan = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    await installmentService.deletePlan(courseId);
    res.json({ success: true, message: 'Installment plan removed' });
  } catch (error) {
    next(error);
  }
};

/**
 * User: start installment enrollment (create enrollment + schedule)
 */
export const startInstallmentEnrollment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }
    const result = await installmentService.startInstallmentEnrollment(userId, courseId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * User: get my installments
 */
export const getMyInstallments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, courseId } = req.query;
    const list = await installmentService.getMyInstallments(userId, { status, courseId });
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

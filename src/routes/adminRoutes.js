import express from 'express';
import {
  blockUser,
  unblockUser,
  getAllUsers,
  getUserById,
  getDashboardStats,
  getFinancialOverview,
  getIncomeBreakdown,
  getExpenseBreakdown,
  getProfitLoss,
  getSalarySummary,
  getAllPayments,
  getInstructorEarnings,
  getInstructorEarningsSummary,
  markInstructorEarningsPaid,
  updateInstructorCommissionRate,
  getAccountOverview,
  getAllTransactions,
  getAccountBalance,
  getAccountStatement,
  createManualSalaryPayment,
} from '../controllers/adminController.js';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  markExpenseAsPaid,
  getExpenseStatistics,
} from '../controllers/expenseController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { userIdValidation, userIdParamValidation, paginationValidation, validate, body, param } from '../utils/validators.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ==================== USER MANAGEMENT ====================
router.post('/users/block', validate(userIdValidation), blockUser);
router.post('/users/unblock', validate(userIdValidation), unblockUser);
router.get('/users', validate(paginationValidation), getAllUsers);
router.get('/users/:userId', validate(userIdParamValidation), getUserById);

// ==================== DASHBOARD ====================
router.get('/dashboard/stats', getDashboardStats);

// ==================== FINANCIAL MANAGEMENT ====================
router.get('/finance/overview', getFinancialOverview);
router.get('/finance/income', getIncomeBreakdown);
router.get('/finance/expenses', getExpenseBreakdown);
router.get('/finance/profit-loss', getProfitLoss);
router.get('/finance/salary-summary', getSalarySummary);
router.get('/finance/payments', getAllPayments);

// ==================== EXPENSE MANAGEMENT ====================
router.post(
  '/expenses',
  validate([
    body('title').trim().isLength({ min: 1, max: 255 }),
    body('amount').isFloat({ min: 0 }),
    body('category').isIn([
      'MARKETING',
      'SALARY',
      'INFRASTRUCTURE',
      'SOFTWARE',
      'HARDWARE',
      'OFFICE_RENT',
      'UTILITIES',
      'INSURANCE',
      'PROFESSIONAL_SERVICES',
      'TRAVEL',
      'TRAINING',
      'OTHER',
    ]),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'PAID']),
    body('paymentDate').optional().isISO8601(),
    body('description').optional().isString(),
    body('paymentMethod').optional().isString(),
    body('receiptUrl').optional().isURL(),
    body('invoiceNumber').optional().isString(),
  ]),
  createExpense
);
router.get('/expenses', getExpenses);
router.get('/expenses/statistics', getExpenseStatistics);
router.get('/expenses/:id', getExpenseById);
router.put(
  '/expenses/:id',
  validate([
    param('id').isUUID().withMessage('Invalid expense ID'),
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('amount').optional().isFloat({ min: 0 }),
    body('category').optional().isIn([
      'OPERATIONAL',
      'MARKETING',
      'SALARIES',
      'SOFTWARE',
      'TRAVEL',
      'OFFICE_SUPPLIES',
      'OTHER',
    ]),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'PAID']),
    body('paymentDate').optional().isISO8601(),
    body('description').optional().isString(),
    body('paymentMethod').optional().isString(),
    body('receiptUrl').optional().isURL(),
    body('invoiceNumber').optional().isString(),
  ]),
  updateExpense
);
router.delete('/expenses/:id', validate([param('id').isUUID()]), deleteExpense);
router.post('/expenses/:id/approve', validate([param('id').isUUID()]), approveExpense);
router.post(
  '/expenses/:id/reject',
  validate([
    param('id').isUUID(),
    body('reason').optional().isString(),
  ]),
  rejectExpense
);
router.post(
  '/expenses/:id/mark-paid',
  validate([
    param('id').isUUID(),
    body('paymentMethod').optional().isString(),
    body('paymentDate').optional().isISO8601(),
  ]),
  markExpenseAsPaid
);

// ==================== INSTRUCTOR EARNINGS ====================
router.get('/instructors/earnings', getInstructorEarnings);
router.get('/instructors/:instructorId/earnings', getInstructorEarnings);
router.get('/instructors/:instructorId/earnings-summary', getInstructorEarningsSummary);
router.post(
  '/instructors/earnings/mark-paid',
  validate([
    body('earningIds').isArray({ min: 1 }),
    body('earningIds.*').isUUID(),
    body('paymentMethod').optional().isString(),
    body('transactionId').optional().isString(),
    body('paidAt').optional().isISO8601(),
  ]),
  markInstructorEarningsPaid
);
router.put(
  '/instructors/:instructorId/commission-rate',
  validate([body('commissionRate').isFloat({ min: 0, max: 100 })]),
  updateInstructorCommissionRate
);
router.post(
  '/instructors/salaries/create',
  validate([
    body('instructorId').isUUID().withMessage('Valid instructor ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paymentDate').optional().isISO8601().withMessage('Valid payment date is required'),
    body('description').optional().isString(),
    body('paymentMethod').optional().isString(),
  ]),
  createManualSalaryPayment
);

// ==================== ACCOUNT MANAGEMENT ====================
router.get('/account/overview', getAccountOverview);
router.get('/account/transactions', getAllTransactions);
router.get('/account/balance', getAccountBalance);
router.get('/account/statement', getAccountStatement);

export default router;


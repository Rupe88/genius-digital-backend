import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { User } from '@/lib/types/auth';
import { PaginatedResponse, ApiResponse, Pagination } from '@/lib/types/api';

export interface AdminStats {
  revenue: {
    today: number;
    thisMonth: number;
    total: number;
  };
  expenses: number;
  profit: number;
  pendingSalaries: number;
  pendingExpenses: number;
  users: { total: number };
  courses: { total: number };
  enrollments: { total: number };
  payments: { total: number };
}

export interface FinancialOverview {
  revenue: number;
  expenses: number;
  profit: number;
  pendingSalaries: number;
  pendingExpenses: number;
  totalIncome: number;
  totalOutcome: number;
  balance: number;
}

export interface IncomeBreakdown {
  totalRevenue: number;
  courseSales: number;
  productSales: number;
  eventRegistrations: number;
  paymentMethodBreakdown: Record<string, number>;
  courseSalesDetail: Array<{
    courseId: string;
    courseTitle: string;
    total: number;
    count: number;
  }>;
  total: number;
  byCategory: Record<string, number>;
  byMethod: Record<string, number>;
  trend: Array<{ date: string; amount: number }>;
}

export interface ExpenseBreakdown {
  total: number;
  byCategory: Record<string, number>;
  statusDistribution: Record<string, number>;
  trend: Array<{ date: string; amount: number }>;
}

export interface SalarySummary {
  totalSalaries: number;
  paidSalaries: number;
  pendingSalaries: number;
  totalPaid: number;
  totalPending: number;
  instructorCount: number;
  breakdown: Array<{
    instructorId: string;
    instructorName: string;
    paidAmount: number;
    pendingAmount: number;
  }>;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  status: string;
  instructorId?: string;
  courseId?: string;
  paymentDate?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  invoiceNumber?: string;
  submittedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstructorEarning {
  id: string;
  instructorId: string;
  courseId: string;
  paymentId: string;
  enrollmentId: string;
  amount: number;
  commissionRate: number;
  status: string;
  paidAt?: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const getAllUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<User>> => {
  try {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<User> | { users: User[]; pagination: Pagination }>>(API_ENDPOINTS.ADMIN.USERS, {
      params,
    });
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      if ('users' in responseData.data) {
        return {
          data: responseData.data.users || [],
          pagination: responseData.data.pagination,
        };
      }
      return responseData.data;
    }
    return handleApiResponse<PaginatedResponse<User>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getUserById = async (id: string): Promise<User> => {
  try {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(API_ENDPOINTS.ADMIN.USER_BY_ID(id));
    const data = handleApiResponse<{ user: User }>(response);
    return data.user;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const blockUser = async (userId: string): Promise<void> => {
  try {
    const response = await apiClient.post<ApiResponse<void>>(API_ENDPOINTS.ADMIN.BLOCK_USER, { userId });
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const unblockUser = async (userId: string): Promise<void> => {
  try {
    const response = await apiClient.post<ApiResponse<void>>(API_ENDPOINTS.ADMIN.UNBLOCK_USER, { userId });
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== DASHBOARD ====================

export const getDashboardStats = async (): Promise<AdminStats> => {
  try {
    const response = await apiClient.get<ApiResponse<AdminStats>>(API_ENDPOINTS.ADMIN.DASHBOARD_STATS);
    return handleApiResponse<AdminStats>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== FINANCIAL MANAGEMENT ====================

export const getFinancialOverview = async (): Promise<FinancialOverview> => {
  try {
    const response = await apiClient.get<ApiResponse<FinancialOverview>>(API_ENDPOINTS.ADMIN.FINANCE_OVERVIEW);
    return handleApiResponse<FinancialOverview>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getIncomeBreakdown = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<IncomeBreakdown> => {
  try {
    const response = await apiClient.get<ApiResponse<IncomeBreakdown>>(API_ENDPOINTS.ADMIN.FINANCE_INCOME, { params });
    return handleApiResponse<IncomeBreakdown>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getExpenseBreakdown = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<ExpenseBreakdown> => {
  try {
    const response = await apiClient.get<ApiResponse<ExpenseBreakdown>>(API_ENDPOINTS.ADMIN.FINANCE_EXPENSES, { params });
    return handleApiResponse<ExpenseBreakdown>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getProfitLoss = async (params?: {
  startDate?: string;
  endDate?: string;
  format?: 'json' | 'csv';
}): Promise<any> => {
  try {
    if (params?.format === 'csv') {
      const response = await apiClient.get(API_ENDPOINTS.ADMIN.FINANCE_PROFIT_LOSS, {
        params,
        responseType: 'blob',
      });
      return response.data;
    }
    const response = await apiClient.get<ApiResponse<unknown>>(API_ENDPOINTS.ADMIN.FINANCE_PROFIT_LOSS, { params });
    return handleApiResponse<unknown>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getSalarySummary = async (params?: {
  startDate?: string;
  endDate?: string;
  instructorId?: string;
}): Promise<SalarySummary> => {
  try {
    const response = await apiClient.get<ApiResponse<SalarySummary>>(API_ENDPOINTS.ADMIN.FINANCE_SALARY_SUMMARY, { params });
    return handleApiResponse<SalarySummary>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getAllPayments = async (params?: {
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<any>> => {
  try {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<unknown>>>(API_ENDPOINTS.ADMIN.FINANCE_PAYMENTS, { params });
    return handleApiResponse<PaginatedResponse<unknown>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== EXPENSE MANAGEMENT ====================

export const createExpense = async (expense: Partial<Expense>): Promise<Expense> => {
  try {
    const response = await apiClient.post<ApiResponse<Expense>>(API_ENDPOINTS.ADMIN.EXPENSES, expense);
    return handleApiResponse<Expense>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getExpenses = async (params?: {
  category?: string;
  status?: string;
  instructorId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<Expense>> => {
  try {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Expense>>>(API_ENDPOINTS.ADMIN.EXPENSES, { params });
    return handleApiResponse<PaginatedResponse<Expense>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getExpenseById = async (id: string): Promise<Expense> => {
  try {
    const response = await apiClient.get<ApiResponse<Expense>>(API_ENDPOINTS.ADMIN.EXPENSE_BY_ID(id));
    return handleApiResponse<Expense>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateExpense = async (id: string, expense: Partial<Expense>): Promise<Expense> => {
  try {
    const response = await apiClient.put<ApiResponse<Expense>>(API_ENDPOINTS.ADMIN.EXPENSE_BY_ID(id), expense);
    return handleApiResponse<Expense>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteExpense = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.ADMIN.EXPENSE_BY_ID(id));
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const approveExpense = async (id: string): Promise<Expense> => {
  try {
    const response = await apiClient.post<ApiResponse<Expense>>(API_ENDPOINTS.ADMIN.EXPENSE_APPROVE(id));
    return handleApiResponse<Expense>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const rejectExpense = async (id: string, reason?: string): Promise<Expense> => {
  try {
    const response = await apiClient.post<ApiResponse<Expense>>(API_ENDPOINTS.ADMIN.EXPENSE_REJECT(id), { reason });
    return handleApiResponse<Expense>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const markExpenseAsPaid = async (
  id: string,
  data: { paymentDate?: string; paymentMethod?: string; receiptUrl?: string }
): Promise<Expense> => {
  try {
    const response = await apiClient.post<ApiResponse<Expense>>(API_ENDPOINTS.ADMIN.EXPENSE_MARK_PAID(id), data);
    return handleApiResponse<Expense>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getExpenseStatistics = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get<ApiResponse<unknown>>(API_ENDPOINTS.ADMIN.EXPENSES_STATISTICS, { params });
    return handleApiResponse<unknown>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== INSTRUCTOR EARNINGS ====================

export const getInstructorEarnings = async (params?: {
  instructorId?: string;
  courseId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<InstructorEarning>> => {
  try {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<InstructorEarning> | { data: InstructorEarning[]; pagination: Pagination }>>(API_ENDPOINTS.ADMIN.INSTRUCTOR_EARNINGS, { params });
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      if ('data' in responseData.data) {
        return {
          data: responseData.data.data || [],
          pagination: responseData.data.pagination,
        };
      }
      return responseData.data as PaginatedResponse<InstructorEarning>;
    }
    return handleApiResponse<PaginatedResponse<InstructorEarning>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getInstructorEarningsSummary = async (
  instructorId: string,
  params?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<any> => {
  try {
    const response = await apiClient.get<ApiResponse<unknown>>(API_ENDPOINTS.ADMIN.INSTRUCTOR_EARNINGS_SUMMARY(instructorId), {
      params,
    });
    return handleApiResponse<unknown>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const markInstructorEarningsPaid = async (data: {
  earningIds: string[];
  paidAt?: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}): Promise<void> => {
  try {
    const response = await apiClient.post<ApiResponse<void>>(API_ENDPOINTS.ADMIN.INSTRUCTOR_EARNINGS_MARK_PAID, data);
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateInstructorCommissionRate = async (
  instructorId: string,
  commissionRate: number
): Promise<void> => {
  try {
    const response = await apiClient.put<ApiResponse<void>>(API_ENDPOINTS.ADMIN.INSTRUCTOR_COMMISSION_RATE(instructorId), {
      commissionRate,
    });
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== ACCOUNT MANAGEMENT ====================

export const getAccountOverview = async (): Promise<any> => {
  try {
    const response = await apiClient.get<ApiResponse<unknown>>(API_ENDPOINTS.ADMIN.ACCOUNT_OVERVIEW);
    return handleApiResponse<unknown>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getAllTransactions = async (params?: {
  type?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<any>> => {
  try {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<unknown>>>(API_ENDPOINTS.ADMIN.ACCOUNT_TRANSACTIONS, { params });
    return handleApiResponse<PaginatedResponse<unknown>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getAccountBalance = async (): Promise<any> => {
  try {
    const response = await apiClient.get<ApiResponse<unknown>>(API_ENDPOINTS.ADMIN.ACCOUNT_BALANCE);
    return handleApiResponse<unknown>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getAccountStatement = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get<ApiResponse<unknown>>(API_ENDPOINTS.ADMIN.ACCOUNT_STATEMENT, { params });
    return handleApiResponse<unknown>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

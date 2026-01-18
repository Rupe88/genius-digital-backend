import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { User } from '@/lib/types/auth';
import { PaginatedResponse } from '@/lib/types/api';

export const getAllUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<User>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.USERS, {
      params,
    });
    // Backend returns: { success: true, data: { users: [...], pagination: {...} } }
    const responseData = response.data as any;
    if (responseData.success && responseData.data) {
      // Handle nested structure: data.users and data.pagination
      if (responseData.data.users) {
        return {
          data: responseData.data.users || [],
          pagination: responseData.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
        };
      }
      // Handle flat structure: data: [...], pagination: {...}
      return {
        data: Array.isArray(responseData.data) ? responseData.data : [],
        pagination: responseData.pagination || responseData.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
      };
    }
    // Fallback to handleApiResponse
    const data = handleApiResponse<any>(response as any);
    // Check if data has users property (nested) or is array (flat)
    if (data?.users) {
      return {
        data: data.users || [],
        pagination: data.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
      };
    }
    return {
      data: Array.isArray(data) ? data : data?.data || [],
      pagination: data?.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
    };
  } catch (error) {
    console.error('getAllUsers error:', error);
    throw new Error(handleApiError(error));
  }
};

export const getUserById = async (id: string): Promise<User> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.USER_BY_ID(id));
    const data = handleApiResponse<{ user: User }>(response as any);
    return data.user;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const blockUser = async (userId: string): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.ADMIN.BLOCK_USER, { userId });
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const unblockUser = async (userId: string): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.ADMIN.UNBLOCK_USER, { userId });
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== DASHBOARD ====================

export const getDashboardStats = async (): Promise<any> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.DASHBOARD_STATS);
    return handleApiResponse<any>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== FINANCIAL MANAGEMENT ====================

export const getFinancialOverview = async (): Promise<any> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.FINANCE_OVERVIEW);
    return handleApiResponse<any>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getIncomeBreakdown = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.FINANCE_INCOME, { params });
    return handleApiResponse<any>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getExpenseBreakdown = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.FINANCE_EXPENSES, { params });
    return handleApiResponse<any>(response as any);
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
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.FINANCE_PROFIT_LOSS, { params });
    return handleApiResponse<any>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getSalarySummary = async (params?: {
  startDate?: string;
  endDate?: string;
  instructorId?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.FINANCE_SALARY_SUMMARY, { params });
    return handleApiResponse<any>(response as any);
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
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.FINANCE_PAYMENTS, { params });
    return handleApiResponse<PaginatedResponse<any>>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== EXPENSE MANAGEMENT ====================

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

export const createExpense = async (expense: Partial<Expense>): Promise<Expense> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN.EXPENSES, expense);
    const data = handleApiResponse<{ data: Expense }>(response as any);
    return data.data;
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
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.EXPENSES, { params });
    return handleApiResponse<PaginatedResponse<Expense>>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getExpenseById = async (id: string): Promise<Expense> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.EXPENSE_BY_ID(id));
    const data = handleApiResponse<{ data: Expense }>(response as any);
    return data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateExpense = async (id: string, expense: Partial<Expense>): Promise<Expense> => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.ADMIN.EXPENSE_BY_ID(id), expense);
    const data = handleApiResponse<{ data: Expense }>(response as any);
    return data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteExpense = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.ADMIN.EXPENSE_BY_ID(id));
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const approveExpense = async (id: string): Promise<Expense> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN.EXPENSE_APPROVE(id));
    const data = handleApiResponse<{ data: Expense }>(response as any);
    return data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const rejectExpense = async (id: string, reason?: string): Promise<Expense> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN.EXPENSE_REJECT(id), { reason });
    const data = handleApiResponse<{ data: Expense }>(response as any);
    return data.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const markExpenseAsPaid = async (
  id: string,
  data: { paymentDate?: string; paymentMethod?: string; receiptUrl?: string }
): Promise<Expense> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN.EXPENSE_MARK_PAID(id), data);
    const result = handleApiResponse<{ data: Expense }>(response as any);
    return result.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getExpenseStatistics = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.EXPENSES_STATISTICS, { params });
    return handleApiResponse<any>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== INSTRUCTOR EARNINGS ====================

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
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.INSTRUCTOR_EARNINGS, { params });
    // Backend returns: { success: true, data: earnings[], pagination: {...} }
    const responseData = response.data as any;
    if (responseData.success && responseData.data) {
      return {
        data: responseData.data || [],
        pagination: responseData.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
      };
    }
    // Fallback to handleApiResponse for other structures
    const data = handleApiResponse<{ data: InstructorEarning[]; pagination: any }>(response as any);
    return {
      data: data.data || data || [],
      pagination: data.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
    };
  } catch (error) {
    console.error('getInstructorEarnings error:', error);
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
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.INSTRUCTOR_EARNINGS_SUMMARY(instructorId), {
      params,
    });
    return handleApiResponse<any>(response as any);
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
}): Promise<any> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN.INSTRUCTOR_EARNINGS_MARK_PAID, data);
    return handleApiResponse<any>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateInstructorCommissionRate = async (
  instructorId: string,
  commissionRate: number
): Promise<any> => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.ADMIN.INSTRUCTOR_COMMISSION_RATE(instructorId), {
      commissionRate,
    });
    return handleApiResponse<any>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// ==================== ACCOUNT MANAGEMENT ====================

export const getAccountOverview = async (): Promise<any> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.ACCOUNT_OVERVIEW);
    return handleApiResponse<any>(response as any);
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
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.ACCOUNT_TRANSACTIONS, { params });
    return handleApiResponse<PaginatedResponse<any>>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getAccountBalance = async (): Promise<any> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.ACCOUNT_BALANCE);
    return handleApiResponse<any>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getAccountStatement = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.ACCOUNT_STATEMENT, { params });
    return handleApiResponse<any>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


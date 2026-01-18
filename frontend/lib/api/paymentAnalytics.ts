import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { PaymentAnalytics, PaymentTrend } from '@/lib/types/payment';
import { ApiResponse } from '@/lib/types/api';

export const getPaymentAnalytics = async (params?: {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
}): Promise<PaymentAnalytics> => {
  try {
    const response = await apiClient.get<ApiResponse<PaymentAnalytics>>(API_ENDPOINTS.PAYMENT_ANALYTICS.ANALYTICS, {
      params,
    });
    return handleApiResponse<PaymentAnalytics>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getPaymentTrends = async (days: number = 30): Promise<PaymentTrend[]> => {
  try {
    const response = await apiClient.get<ApiResponse<PaymentTrend[]>>(API_ENDPOINTS.PAYMENT_ANALYTICS.TRENDS, {
      params: { days },
    });
    return handleApiResponse<PaymentTrend[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getTopPaymentMethods = async (limit: number = 5): Promise<Array<{ method: string; count: number; total: number }>> => {
  try {
    const response = await apiClient.get<ApiResponse<Array<{ method: string; count: number; total: number }>>>(API_ENDPOINTS.PAYMENT_ANALYTICS.TOP_METHODS, {
      params: { limit },
    });
    return handleApiResponse<Array<{ method: string; count: number; total: number }>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


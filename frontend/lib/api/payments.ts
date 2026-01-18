import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Payment, PaymentAnalytics, PaymentTrend } from '@/lib/types/payment';
import { PaginatedResponse } from '@/lib/types/api';

export const createPayment = async (data: {
  courseId?: string;
  productIds?: string[];
  amount: number;
  paymentMethod: string;
  couponCode?: string;
}): Promise<Payment> => {
  try {
    const response = await apiClient.post<{ data: Payment }>(API_ENDPOINTS.PAYMENTS.CREATE, data);
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const verifyPayment = async (transactionId: string, paymentMethod: string): Promise<Payment> => {
  try {
    const response = await apiClient.post<{ data: Payment }>(API_ENDPOINTS.PAYMENTS.VERIFY, {
      transactionId,
      paymentMethod,
    });
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getPaymentHistory = async (params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Payment>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.HISTORY, {
      params,
    });
    return handleApiResponse<PaginatedResponse<Payment>>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getPaymentById = async (id: string): Promise<Payment> => {
  try {
    const response = await apiClient.get<{ data: Payment }>(API_ENDPOINTS.PAYMENTS.BY_ID(id));
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


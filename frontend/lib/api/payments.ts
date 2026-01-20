import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Payment } from '@/lib/types/payment';
import { PaginatedResponse, ApiResponse } from '@/lib/types/api';

export interface InitiatePaymentResponse {
  success: boolean;
  paymentId: string;
  transactionId: string;
  amount: number;
  discount: number;
  paymentMethod: string;
  paymentDetails: {
    paymentUrl: string;
    formData?: Record<string, string>;
    [key: string]: any;
  };
}

export const createPayment = async (data: {
  courseId?: string;
  orderId?: string;
  productIds?: string[];
  amount: number;
  paymentMethod: string;
  couponCode?: string;
  referralClickId?: string;
  successUrl?: string;
  failureUrl?: string;
}): Promise<InitiatePaymentResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<InitiatePaymentResponse>>(API_ENDPOINTS.PAYMENTS.CREATE, data);
    return handleApiResponse<InitiatePaymentResponse>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const verifyPayment = async (transactionId: string, paymentMethod: string): Promise<Payment> => {
  try {
    const response = await apiClient.post<ApiResponse<Payment>>(API_ENDPOINTS.PAYMENTS.VERIFY, {
      transactionId,
      paymentMethod,
    });
    return handleApiResponse<Payment>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getPaymentHistory = async (params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Payment>> => {
  try {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Payment>>>(API_ENDPOINTS.PAYMENTS.HISTORY, {
      params,
    });
    return handleApiResponse<PaginatedResponse<Payment>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getPaymentById = async (id: string): Promise<Payment> => {
  try {
    const response = await apiClient.get<ApiResponse<Payment>>(API_ENDPOINTS.PAYMENTS.BY_ID(id));
    return handleApiResponse<Payment>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


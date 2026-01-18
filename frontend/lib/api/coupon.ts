import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse } from '@/lib/types/api';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponRequest {
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
}

export interface UpdateCouponRequest {
  code?: string;
  description?: string;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export interface ValidateCouponRequest {
  code: string;
  amount: number;
}

export interface ValidateCouponResponse {
  valid: boolean;
  discount: number;
  message: string;
}

/**
 * Get all coupons (admin only)
 */
export const getAllCoupons = async (): Promise<Coupon[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Coupon[]>>(API_ENDPOINTS.COUPONS.LIST);
    return handleApiResponse<Coupon[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get coupon by ID (admin only)
 */
export const getCouponById = async (id: string): Promise<Coupon> => {
  try {
    const response = await apiClient.get<ApiResponse<Coupon>>(API_ENDPOINTS.COUPONS.BY_ID(id));
    return handleApiResponse<Coupon>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create new coupon (admin only)
 */
export const createCoupon = async (data: CreateCouponRequest): Promise<Coupon> => {
  try {
    const response = await apiClient.post<ApiResponse<Coupon>>(API_ENDPOINTS.COUPONS.LIST, data);
    return handleApiResponse<Coupon>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update coupon (admin only)
 */
export const updateCoupon = async (id: string, data: UpdateCouponRequest): Promise<Coupon> => {
  try {
    const response = await apiClient.put<ApiResponse<Coupon>>(API_ENDPOINTS.COUPONS.BY_ID(id), data);
    return handleApiResponse<Coupon>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete coupon (admin only)
 */
export const deleteCoupon = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.COUPONS.BY_ID(id));
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get active coupons
 */
export const getActiveCoupons = async (): Promise<Coupon[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Coupon[]>>(API_ENDPOINTS.COUPONS.ACTIVE);
    return handleApiResponse<Coupon[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Validate coupon
 */
export const validateCoupon = async (data: ValidateCouponRequest): Promise<ValidateCouponResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<ValidateCouponResponse>>(API_ENDPOINTS.COUPONS.VALIDATE, data);
    return handleApiResponse<ValidateCouponResponse>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility
export const couponApi = {
  getAll: getAllCoupons,
  getById: getCouponById,
  create: createCoupon,
  update: updateCoupon,
  delete: deleteCoupon,
  getActive: getActiveCoupons,
  validate: validateCoupon,
};

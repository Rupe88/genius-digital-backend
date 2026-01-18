import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Coupon API
 */
export const couponApi = {
  /**
   * Get all coupons (admin only)
   */
  getAll: async (): Promise<ApiResponse<Coupon[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.COUPONS.LIST);
    return response.data;
  },

  /**
   * Get coupon by ID (admin only)
   */
  getById: async (id: string): Promise<ApiResponse<Coupon>> => {
    const response = await apiClient.get(API_ENDPOINTS.COUPONS.BY_ID(id));
    return response.data;
  },

  /**
   * Create new coupon (admin only)
   */
  create: async (data: CreateCouponRequest): Promise<ApiResponse<Coupon>> => {
    const response = await apiClient.post(API_ENDPOINTS.COUPONS.LIST, data);
    return response.data;
  },

  /**
   * Update coupon (admin only)
   */
  update: async (id: string, data: UpdateCouponRequest): Promise<ApiResponse<Coupon>> => {
    const response = await apiClient.put(API_ENDPOINTS.COUPONS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete coupon (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.COUPONS.BY_ID(id));
    return response.data;
  },

  /**
   * Get active coupons
   */
  getActive: async (): Promise<ApiResponse<Coupon[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.COUPONS.ACTIVE);
    return response.data;
  },

  /**
   * Validate coupon
   */
  validate: async (data: ValidateCouponRequest): Promise<ApiResponse<ValidateCouponResponse>> => {
    const response = await apiClient.post(API_ENDPOINTS.COUPONS.VALIDATE, data);
    return response.data;
  },
};

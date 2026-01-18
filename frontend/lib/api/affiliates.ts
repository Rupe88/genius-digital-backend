import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface Affiliate {
  id: string;
  userId: string;
  referralCode: string;
  commissionRate: number;
  totalEarnings: number;
  pendingEarnings: number;
  totalReferrals: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    fullName: string;
    email: string;
  };
}

export interface AffiliateReferral {
  id: string;
  affiliateId: string;
  referredUserId: string;
  courseId?: string;
  productId?: string;
  amount: number;
  commission: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  referredUser?: {
    fullName: string;
    email: string;
  };
}

export interface AffiliateStats {
  totalEarnings: number;
  pendingEarnings: number;
  totalReferrals: number;
  conversionRate: number;
  recentReferrals: AffiliateReferral[];
}

export interface BecomeAffiliateRequest {
  commissionRate?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Affiliates API
 */
export const affiliatesApi = {
  /**
   * Get all affiliates (admin only)
   */
  getAll: async (): Promise<ApiResponse<Affiliate[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.AFFILIATES.LIST);
    return response.data;
  },

  /**
   * Get current user's affiliate profile
   */
  getProfile: async (): Promise<ApiResponse<Affiliate>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.AFFILIATES.LIST}/profile`);
    return response.data;
  },

  /**
   * Become an affiliate
   */
  becomeAffiliate: async (data?: BecomeAffiliateRequest): Promise<ApiResponse<Affiliate>> => {
    const response = await apiClient.post(`${API_ENDPOINTS.AFFILIATES.LIST}/become-affiliate`, data);
    return response.data;
  },

  /**
   * Get affiliate statistics
   */
  getStats: async (): Promise<ApiResponse<AffiliateStats>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.AFFILIATES.LIST}/stats`);
    return response.data;
  },

  /**
   * Get affiliate referrals
   */
  getReferrals: async (): Promise<ApiResponse<AffiliateReferral[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.AFFILIATES.LIST}/referrals`);
    return response.data;
  },

  /**
   * Update affiliate settings (admin only)
   */
  updateAffiliate: async (id: string, data: { commissionRate?: number; isActive?: boolean }): Promise<ApiResponse<Affiliate>> => {
    const response = await apiClient.put(API_ENDPOINTS.AFFILIATES.BY_ID(id), data);
    return response.data;
  },

  /**
   * Generate referral link
   */
  generateReferralLink: async (courseId?: string, productId?: string): Promise<ApiResponse<{ referralLink: string }>> => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (productId) params.append('productId', productId);

    const url = `${API_ENDPOINTS.AFFILIATES.LIST}/referral-link${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },
};

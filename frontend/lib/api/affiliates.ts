import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse } from '@/lib/types/api';

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

/**
 * Get all affiliates (admin only)
 */
export const getAllAffiliates = async (): Promise<Affiliate[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Affiliate[]>>(API_ENDPOINTS.AFFILIATES.LIST);
    return handleApiResponse<Affiliate[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get current user's affiliate profile
 */
export const getAffiliateProfile = async (): Promise<Affiliate> => {
  try {
    const response = await apiClient.get<ApiResponse<Affiliate>>(`${API_ENDPOINTS.AFFILIATES.LIST}/profile`);
    return handleApiResponse<Affiliate>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Become an affiliate
 */
export const becomeAffiliate = async (data?: BecomeAffiliateRequest): Promise<Affiliate> => {
  try {
    const response = await apiClient.post<ApiResponse<Affiliate>>(`${API_ENDPOINTS.AFFILIATES.LIST}/become-affiliate`, data);
    return handleApiResponse<Affiliate>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get affiliate statistics
 */
export const getAffiliateStats = async (): Promise<AffiliateStats> => {
  try {
    const response = await apiClient.get<ApiResponse<AffiliateStats>>(`${API_ENDPOINTS.AFFILIATES.LIST}/stats`);
    return handleApiResponse<AffiliateStats>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get affiliate referrals
 */
export const getAffiliateReferrals = async (): Promise<AffiliateReferral[]> => {
  try {
    const response = await apiClient.get<ApiResponse<AffiliateReferral[]>>(`${API_ENDPOINTS.AFFILIATES.LIST}/referrals`);
    return handleApiResponse<AffiliateReferral[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update affiliate settings (admin only)
 */
export const updateAffiliate = async (id: string, data: { commissionRate?: number; isActive?: boolean }): Promise<Affiliate> => {
  try {
    const response = await apiClient.put<ApiResponse<Affiliate>>(API_ENDPOINTS.AFFILIATES.BY_ID(id), data);
    return handleApiResponse<Affiliate>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Generate referral link
 */
export const generateReferralLink = async (courseId?: string, productId?: string): Promise<{ referralLink: string }> => {
  try {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (productId) params.append('productId', productId);

    const url = `${API_ENDPOINTS.AFFILIATES.LIST}/referral-link${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<ApiResponse<{ referralLink: string }>>(url);
    return handleApiResponse<{ referralLink: string }>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility while components are updated
export const affiliatesApi = {
  getAll: getAllAffiliates,
  getProfile: getAffiliateProfile,
  becomeAffiliate: becomeAffiliate,
  getStats: getAffiliateStats,
  getReferrals: getAffiliateReferrals,
  updateAffiliate: updateAffiliate,
  generateReferralLink: generateReferralLink,
};

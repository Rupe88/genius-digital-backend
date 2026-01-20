import { apiClient, handleApiResponse, handleApiError } from './axios';
import { ApiResponse, PaginatedResponse } from '@/lib/types/api';

// Types for referral system
export interface ReferralLink {
  id: string;
  referralCode: string;
  courseId: string;
  course: {
    id: string;
    title: string;
    price: number;
    thumbnail?: string;
  };
  totalClicks: number;
  totalConversions: number;
  totalEarnings?: number;
  isActive: boolean;
  createdAt: string;
}

export interface ReferralStats {
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  commissionRate: number;
  links: ReferralLink[];
}

export interface SharingLinks {
  referralCode: string;
  shareUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  whatsappUrl: string;
}

export interface ReferralConversion {
  id: string;
  referralLinkId: string;
  clickId: string;
  convertedById: string;
  enrollmentId: string;
  courseId: string;
  commissionAmount: number;
  commissionRate: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  isFraudulent: boolean;
  fraudReason?: string;
  paidAt?: string;
  createdAt: string;
  referralLink: {
    user: {
      id: string;
      fullName: string;
      email: string;
    };
    course: {
      id: string;
      title: string;
      price?: number;
    };
  };
  convertedBy: {
    id: string;
    fullName: string;
    email: string;
  };
  click: {
    ipAddress?: string;
    clickedAt: string;
  };
}

export interface ReferralAnalytics {
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  totalCommission: number;
}

/**
 * Generate sharing links for a course
 */
export const generateSharingLinks = async (courseId: string): Promise<SharingLinks> => {
  try {
    const response = await apiClient.get<ApiResponse<SharingLinks>>(`/referrals/share/${courseId}`);
    return handleApiResponse<SharingLinks>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get user's referral statistics
 */
export const getReferralStats = async (): Promise<ReferralStats> => {
  try {
    const response = await apiClient.get<ApiResponse<ReferralStats>>('/referrals/stats');
    return handleApiResponse<ReferralStats>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get user's referral links
 */
export const getReferralLinks = async (
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<ReferralLink>> => {
  try {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    const response = await apiClient.get<ApiResponse<PaginatedResponse<ReferralLink>>>(
      `/referrals/links?${params}`
    );
    return handleApiResponse<PaginatedResponse<ReferralLink>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Deactivate a referral link
 */
export const deactivateReferralLink = async (linkId: string): Promise<void> => {
  try {
    const response = await apiClient.patch<ApiResponse<void>>(`/referrals/links/${linkId}/deactivate`);
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Reactivate a referral link
 */
export const reactivateReferralLink = async (linkId: string): Promise<void> => {
  try {
    const response = await apiClient.patch<ApiResponse<void>>(`/referrals/links/${linkId}/reactivate`);
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get referral analytics (Admin only)
 */
export const getReferralAnalytics = async (filters: {
  startDate?: string;
  endDate?: string;
  status?: string;
} = {}): Promise<ReferralAnalytics> => {
  try {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.status) params.append('status', filters.status);

    const query = params.toString();
    const endpoint = `/referrals/admin/analytics${query ? `?${query}` : ''}`;

    const response = await apiClient.get<ApiResponse<ReferralAnalytics>>(endpoint);
    return handleApiResponse<ReferralAnalytics>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get referral conversions (Admin only)
 */
export const getReferralConversions = async (params: {
  status?: string;
  isFraudulent?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedResponse<ReferralConversion>> => {
  try {
    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 10).toString()
    });

    if (params.status) queryParams.append('status', params.status);
    if (params.isFraudulent) queryParams.append('isFraudulent', params.isFraudulent);

    const response = await apiClient.get<ApiResponse<PaginatedResponse<ReferralConversion>>>(
      `/referrals/admin/conversions?${queryParams}`
    );
    return handleApiResponse<PaginatedResponse<ReferralConversion>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Mark referral commissions as paid (Admin only)
 */
export const markCommissionsAsPaid = async (conversionIds: string[]): Promise<{
  conversionsUpdated: number;
  totalAmount: number;
  affiliatesAffected: number;
}> => {
  try {
    const response = await apiClient.post<ApiResponse<{
      conversionsUpdated: number;
      totalAmount: number;
      affiliatesAffected: number;
    }>>('/referrals/admin/commissions/mark-paid', { conversionIds });
    return handleApiResponse<{
      conversionsUpdated: number;
      totalAmount: number;
      affiliatesAffected: number;
    }>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Handle referral click (Public endpoint - redirects)
 * This is typically handled automatically by the browser
 */
export const handleReferralClick = (referralCode: string): void => {
  const clickUrl = `${apiClient.defaults.baseURL}/referrals/click/${referralCode}`;
  window.location.href = clickUrl;
};

/**
 * Track referral click via AJAX
 */
export const trackReferralClick = async (referralCode: string): Promise<{ clickId: string; valid: boolean }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ clickId: string; valid: boolean }>>('/referrals/track', {
      referralCode
    });
    return handleApiResponse<{ clickId: string; valid: boolean }>(response);
  } catch (error) {
    console.error('Failed to track referral click:', error);
    throw error;
  }
};

/**
 * Social Sharing Utilities
 */
export class SocialSharing {
  /**
   * Open sharing popup for social media platforms
   */
  static shareOnPlatform(url: string, platform: string): void {
    const encodedUrl = encodeURIComponent(url);
    let shareUrl = '';

    switch (platform.toLowerCase()) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=Check out this amazing course!`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=Check out this amazing course: ${encodedUrl}`;
        break;
      default:
        console.error('Unsupported platform:', platform);
        return;
    }

    // Open in popup window
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      shareUrl,
      'share-dialog',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  }

  /**
   * Copy link to clipboard
   */
  static async copyToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Generate sharing text for different platforms
   */
  static generateShareText(
    course: { title?: string },
    referralUrl: string,
    platform: string = 'generic'
  ): string {
    const courseTitle = course?.title || 'Amazing Course';
    const baseText = `Check out this amazing course: "${courseTitle}"`;

    switch (platform.toLowerCase()) {
      case 'twitter':
        return `${baseText} ${referralUrl} #Learning #OnlineCourse`;
      case 'linkedin':
        return `${baseText}. Enroll now and start learning! ${referralUrl}`;
      case 'facebook':
        return `${baseText}. Join thousands of learners and advance your career! ${referralUrl}`;
      case 'whatsapp':
        return `👋 Hey! I found this amazing course "${courseTitle}". You should check it out: ${referralUrl}`;
      default:
        return `${baseText} ${referralUrl}`;
    }
  }
}

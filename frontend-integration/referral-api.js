/**
 * Referral System API Integration for Frontend
 * Complete integration with the Vaastu LMS backend referral system
 */

const API_BASE_URL = 'https://goldfish-app-d9t4j.ondigitalocean.app/api';

/**
 * API Response Handler
 */
class ApiResponse {
  constructor(data, error = null) {
    this.success = !error;
    this.data = data;
    this.error = error;
  }

  static success(data) {
    return new ApiResponse(data);
  }

  static error(error) {
    return new ApiResponse(null, error);
  }
}

/**
 * HTTP Client with authentication and error handling
 */
class HttpClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return ApiResponse.success(data);
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      return ApiResponse.error(error.message);
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

/**
 * Referral System API Service
 */
export class ReferralAPI {
  constructor() {
    this.http = new HttpClient();
  }

  /**
   * Set authentication token
   * @param {string} token - JWT access token
   */
  setAuthToken(token) {
    this.http.setToken(token);
  }

  /**
   * Generate sharing links for a course
   * @param {string} courseId - Course ID to share
   * @returns {Promise<ApiResponse>} Sharing URLs and referral code
   */
  async generateSharingLinks(courseId) {
    if (!courseId) {
      return ApiResponse.error('Course ID is required');
    }

    return await this.http.get(`/referrals/share/${courseId}`);
  }

  /**
   * Get user's referral statistics
   * @returns {Promise<ApiResponse>} Referral stats including earnings, clicks, conversions
   */
  async getReferralStats() {
    return await this.http.get('/referrals/stats');
  }

  /**
   * Get user's referral links
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 10)
   * @returns {Promise<ApiResponse>} List of referral links with stats
   */
  async getReferralLinks({ page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return await this.http.get(`/referrals/links?${params}`);
  }

  /**
   * Deactivate a referral link
   * @param {string} linkId - Referral link ID
   * @returns {Promise<ApiResponse>} Success confirmation
   */
  async deactivateReferralLink(linkId) {
    if (!linkId) {
      return ApiResponse.error('Link ID is required');
    }

    return await this.http.patch(`/referrals/links/${linkId}/deactivate`);
  }

  /**
   * Reactivate a referral link
   * @param {string} linkId - Referral link ID
   * @returns {Promise<ApiResponse>} Success confirmation
   */
  async reactivateReferralLink(linkId) {
    if (!linkId) {
      return ApiResponse.error('Link ID is required');
    }

    return await this.http.patch(`/referrals/links/${linkId}/reactivate`);
  }

  /**
   * Get referral analytics (Admin only)
   * @param {Object} filters - Filter options
   * @param {string} filters.startDate - Start date (ISO format)
   * @param {string} filters.endDate - End date (ISO format)
   * @param {string} filters.status - Status filter
   * @returns {Promise<ApiResponse>} System-wide analytics
   */
  async getReferralAnalytics(filters = {}) {
    const params = new URLSearchParams();

    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.status) params.append('status', filters.status);

    const query = params.toString();
    const endpoint = `/referrals/admin/analytics${query ? `?${query}` : ''}`;

    return await this.http.get(endpoint);
  }

  /**
   * Get referral conversions (Admin only)
   * @param {Object} params - Query parameters
   * @param {string} params.status - Status filter (PENDING, PAID)
   * @param {string} params.isFraudulent - Fraud filter (true, false)
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @returns {Promise<ApiResponse>} List of conversions
   */
  async getReferralConversions({ status, isFraudulent, page = 1, limit = 10 } = {}) {
    const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString() });

    if (status) queryParams.append('status', status);
    if (isFraudulent !== undefined) queryParams.append('isFraudulent', isFraudulent);

    return await this.http.get(`/referrals/admin/conversions?${queryParams}`);
  }

  /**
   * Mark referral commissions as paid (Admin only)
   * @param {Array<string>} conversionIds - Array of conversion IDs to mark as paid
   * @returns {Promise<ApiResponse>} Payment confirmation
   */
  async markCommissionsAsPaid(conversionIds) {
    if (!Array.isArray(conversionIds) || conversionIds.length === 0) {
      return ApiResponse.error('Conversion IDs array is required');
    }

    return await this.http.post('/referrals/admin/commissions/mark-paid', {
      conversionIds
    });
  }

  /**
   * Handle referral click (Public endpoint - redirects to course)
   * This is typically handled automatically by the browser when users click shared links
   * @param {string} referralCode - Referral code from the shared link
   */
  async handleReferralClick(referralCode) {
    if (!referralCode) {
      return ApiResponse.error('Referral code is required');
    }

    // This endpoint redirects, so we handle it differently
    const url = `${this.http.baseURL}/referrals/click/${referralCode}`;

    try {
      // For frontend, you might want to use window.location.href = url;
      // or handle the redirect in your component
      window.location.href = url;
      return ApiResponse.success({ redirecting: true });
    } catch (error) {
      return ApiResponse.error('Failed to handle referral click');
    }
  }
}

/**
 * Social Sharing Utilities
 */
export class SocialSharing {
  /**
   * Open sharing popup for social media platforms
   * @param {string} url - URL to share
   * @param {string} platform - Platform name (facebook, linkedin, twitter, whatsapp)
   */
  static shareOnPlatform(url, platform) {
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
   * @param {string} url - URL to copy
   * @returns {Promise<boolean>} Success status
   */
  static async copyToClipboard(url) {
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
   * @param {Object} course - Course information
   * @param {string} referralUrl - Referral URL
   * @param {string} platform - Platform name
   * @returns {string} Formatted sharing text
   */
  static generateShareText(course, referralUrl, platform = 'generic') {
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

/**
 * Referral Hook for React/Vue/Angular
 * Example implementation for React
 */
export class ReferralHook {
  constructor(api) {
    this.api = api;
    this.listeners = [];
  }

  /**
   * Subscribe to referral events
   * @param {Function} callback - Event callback
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners
   * @param {string} event - Event type
   * @param {any} data - Event data
   */
  notify(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  /**
   * Generate sharing links with error handling
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} Sharing data or error
   */
  async generateSharingLinks(courseId) {
    this.notify('loading', { action: 'generate_links' });

    try {
      const response = await this.api.generateSharingLinks(courseId);

      if (response.success) {
        this.notify('success', {
          action: 'generate_links',
          data: response.data
        });
        return { success: true, data: response.data };
      } else {
        this.notify('error', {
          action: 'generate_links',
          error: response.error
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      this.notify('error', {
        action: 'generate_links',
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get referral stats with caching
   * @returns {Promise<Object>} Stats data or error
   */
  async getReferralStats() {
    this.notify('loading', { action: 'get_stats' });

    try {
      const response = await this.api.getReferralStats();

      if (response.success) {
        this.notify('success', {
          action: 'get_stats',
          data: response.data
        });
        return { success: true, data: response.data };
      } else {
        this.notify('error', {
          action: 'get_stats',
          error: response.error
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      this.notify('error', {
        action: 'get_stats',
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }
}

/**
 * Error Handling Utilities
 */
export class ReferralErrors {
  static isNetworkError(error) {
    return error.message.includes('fetch') || error.message.includes('network');
  }

  static isAuthError(error) {
    return error.message.includes('401') || error.message.includes('unauthorized');
  }

  static isValidationError(error) {
    return error.message.includes('validation') || error.message.includes('required');
  }

  static getUserFriendlyMessage(error) {
    if (this.isNetworkError(error)) {
      return 'Network error. Please check your connection and try again.';
    }

    if (this.isAuthError(error)) {
      return 'Please log in to access referral features.';
    }

    if (this.isValidationError(error)) {
      return 'Please check your input and try again.';
    }

    return 'Something went wrong. Please try again later.';
  }
}

/**
 * Default export - Create and configure API instance
 */
const referralAPI = new ReferralAPI();
export default referralAPI;

// Export types for TypeScript users
export const TYPES = {
  ApiResponse,
  ReferralAPI,
  SocialSharing,
  ReferralHook,
  ReferralErrors,
  HttpClient
};

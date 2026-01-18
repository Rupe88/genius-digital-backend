import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  featured: boolean;
  published: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFAQRequest {
  question: string;
  answer: string;
  category: string;
  featured?: boolean;
  published?: boolean;
  order?: number;
}

export interface UpdateFAQRequest {
  question?: string;
  answer?: string;
  category?: string;
  featured?: boolean;
  published?: boolean;
  order?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * FAQ API
 */
export const faqApi = {
  /**
   * Get all FAQs
   */
  getAll: async (): Promise<ApiResponse<FAQ[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.FAQS.LIST);
    return response.data;
  },

  /**
   * Get FAQs by category
   */
  getByCategory: async (category: string): Promise<ApiResponse<FAQ[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.FAQS.LIST}/category/${category}`);
    return response.data;
  },

  /**
   * Get featured FAQs
   */
  getFeatured: async (): Promise<ApiResponse<FAQ[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.FAQS.LIST}/featured`);
    return response.data;
  },

  /**
   * Get FAQ by ID
   */
  getById: async (id: string): Promise<ApiResponse<FAQ>> => {
    const response = await apiClient.get(API_ENDPOINTS.FAQS.BY_ID(id));
    return response.data;
  },

  /**
   * Create new FAQ (admin only)
   */
  create: async (data: CreateFAQRequest): Promise<ApiResponse<FAQ>> => {
    const response = await apiClient.post(API_ENDPOINTS.FAQS.LIST, data);
    return response.data;
  },

  /**
   * Update FAQ (admin only)
   */
  update: async (id: string, data: UpdateFAQRequest): Promise<ApiResponse<FAQ>> => {
    const response = await apiClient.put(API_ENDPOINTS.FAQS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete FAQ (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.FAQS.BY_ID(id));
    return response.data;
  },

  /**
   * Reorder FAQs (admin only)
   */
  reorder: async (faqs: { id: string; order: number }[]): Promise<ApiResponse> => {
    const response = await apiClient.post(`${API_ENDPOINTS.FAQS.LIST}/reorder`, { faqs });
    return response.data;
  },
};

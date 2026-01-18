import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse } from '@/lib/types/api';

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

/**
 * Get all FAQs
 */
export const getAllFAQs = async (): Promise<FAQ[]> => {
  try {
    const response = await apiClient.get<ApiResponse<FAQ[]>>(API_ENDPOINTS.FAQS.LIST);
    return handleApiResponse<FAQ[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get FAQs by category
 */
export const getFAQsByCategory = async (category: string): Promise<FAQ[]> => {
  try {
    const response = await apiClient.get<ApiResponse<FAQ[]>>(`${API_ENDPOINTS.FAQS.LIST}/category/${category}`);
    return handleApiResponse<FAQ[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get featured FAQs
 */
export const getFeaturedFAQs = async (): Promise<FAQ[]> => {
  try {
    const response = await apiClient.get<ApiResponse<FAQ[]>>(`${API_ENDPOINTS.FAQS.LIST}/featured`);
    return handleApiResponse<FAQ[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get FAQ by ID
 */
export const getFAQById = async (id: string): Promise<FAQ> => {
  try {
    const response = await apiClient.get<ApiResponse<FAQ>>(API_ENDPOINTS.FAQS.BY_ID(id));
    return handleApiResponse<FAQ>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create new FAQ (admin only)
 */
export const createFAQ = async (data: CreateFAQRequest): Promise<FAQ> => {
  try {
    const response = await apiClient.post<ApiResponse<FAQ>>(API_ENDPOINTS.FAQS.LIST, data);
    return handleApiResponse<FAQ>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update FAQ (admin only)
 */
export const updateFAQ = async (id: string, data: UpdateFAQRequest): Promise<FAQ> => {
  try {
    const response = await apiClient.put<ApiResponse<FAQ>>(API_ENDPOINTS.FAQS.BY_ID(id), data);
    return handleApiResponse<FAQ>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete FAQ (admin only)
 */
export const deleteFAQ = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.FAQS.BY_ID(id));
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Reorder FAQs (admin only)
 */
export const reorderFAQs = async (faqs: { id: string; order: number }[]): Promise<void> => {
  try {
    const response = await apiClient.post<ApiResponse<void>>(`${API_ENDPOINTS.FAQS.LIST}/reorder`, { faqs });
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility
export const faqApi = {
  getAll: getAllFAQs,
  getByCategory: getFAQsByCategory,
  getFeatured: getFeaturedFAQs,
  getById: getFAQById,
  create: createFAQ,
  update: updateFAQ,
  delete: deleteFAQ,
  reorder: reorderFAQs,
};

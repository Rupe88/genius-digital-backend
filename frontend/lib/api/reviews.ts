import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface Review {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    fullName: string;
    avatar?: string;
  };
  course?: {
    title: string;
  };
}

export interface CreateReviewRequest {
  courseId: string;
  rating: number;
  title: string;
  comment: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  comment?: string;
  published?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Reviews API
 */
export const reviewsApi = {
  /**
   * Get all reviews (admin only)
   */
  getAll: async (): Promise<ApiResponse<Review[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.REVIEWS.LIST);
    return response.data;
  },

  /**
   * Get reviews for a specific course
   */
  getByCourse: async (courseId: string): Promise<ApiResponse<Review[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.REVIEWS.LIST}/course/${courseId}`);
    return response.data;
  },

  /**
   * Get review by ID
   */
  getById: async (id: string): Promise<ApiResponse<Review>> => {
    const response = await apiClient.get(API_ENDPOINTS.REVIEWS.BY_ID(id));
    return response.data;
  },

  /**
   * Create new review
   */
  create: async (data: CreateReviewRequest): Promise<ApiResponse<Review>> => {
    const response = await apiClient.post(API_ENDPOINTS.REVIEWS.CREATE, data);
    return response.data;
  },

  /**
   * Update review (admin only)
   */
  update: async (id: string, data: UpdateReviewRequest): Promise<ApiResponse<Review>> => {
    const response = await apiClient.put(API_ENDPOINTS.REVIEWS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete review (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.REVIEWS.BY_ID(id));
    return response.data;
  },
};

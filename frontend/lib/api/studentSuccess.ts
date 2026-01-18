import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface StudentSuccess {
  id: string;
  title: string;
  description: string;
  studentName: string;
  courseName: string;
  achievement: string;
  imageUrl?: string;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentSuccessRequest {
  title: string;
  description: string;
  studentName: string;
  courseName: string;
  achievement: string;
  imageUrl?: string;
  featured?: boolean;
  published?: boolean;
}

export interface UpdateStudentSuccessRequest {
  title?: string;
  description?: string;
  studentName?: string;
  courseName?: string;
  achievement?: string;
  imageUrl?: string;
  featured?: boolean;
  published?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Student Success API
 */
export const studentSuccessApi = {
  /**
   * Get all student success stories
   */
  getAll: async (): Promise<ApiResponse<StudentSuccess[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.STUDENT_SUCCESS.LIST);
    return response.data;
  },

  /**
   * Get student success by ID
   */
  getById: async (id: string): Promise<ApiResponse<StudentSuccess>> => {
    const response = await apiClient.get(API_ENDPOINTS.STUDENT_SUCCESS.BY_ID(id));
    return response.data;
  },

  /**
   * Create new student success story (admin only)
   */
  create: async (data: CreateStudentSuccessRequest): Promise<ApiResponse<StudentSuccess>> => {
    const response = await apiClient.post(API_ENDPOINTS.STUDENT_SUCCESS.LIST, data);
    return response.data;
  },

  /**
   * Update student success story (admin only)
   */
  update: async (id: string, data: UpdateStudentSuccessRequest): Promise<ApiResponse<StudentSuccess>> => {
    const response = await apiClient.put(API_ENDPOINTS.STUDENT_SUCCESS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete student success story (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.STUDENT_SUCCESS.BY_ID(id));
    return response.data;
  },
};

import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface StudentSuccess {
  id: string;
  studentName: string;
  studentImage?: string;
  courseId?: string;
  course?: { title: string }; // Assuming including course returns object
  title: string;
  story: string;
  achievement?: string;
  company?: string;
  position?: string;
  testimonial?: string;
  isPublished: boolean;
  featured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentSuccessRequest {
  studentName: string;
  studentImage?: string;
  courseId?: string;
  title: string;
  story: string;
  achievement?: string;
  company?: string;
  position?: string;
  testimonial?: string;
  isPublished?: boolean;
  featured?: boolean;
  order?: number;
}

export interface UpdateStudentSuccessRequest extends Partial<CreateStudentSuccessRequest> { }

export interface ApiResponse<T = unknown> {
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

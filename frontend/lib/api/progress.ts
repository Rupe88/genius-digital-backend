import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface LessonProgress {
  id: string;
  enrollmentId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  timeSpent: number; // in minutes
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseProgress {
  courseId: string;
  enrollmentId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  timeSpent: number;
  lastAccessedAt: string;
}

export interface UpdateProgressRequest {
  completed?: boolean;
  timeSpent?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Progress API
 */
export const progressApi = {
  /**
   * Get user's progress for all enrolled courses
   */
  getUserProgress: async (): Promise<ApiResponse<CourseProgress[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.PROGRESS.LIST);
    return response.data;
  },

  /**
   * Get progress for specific enrollment
   */
  getEnrollmentProgress: async (id: string): Promise<ApiResponse<LessonProgress[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.PROGRESS.BY_ID(id));
    return response.data;
  },

  /**
   * Update lesson progress
   */
  updateLessonProgress: async (id: string, data: UpdateProgressRequest): Promise<ApiResponse<LessonProgress>> => {
    const response = await apiClient.put(API_ENDPOINTS.PROGRESS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Mark lesson as completed
   */
  completeLesson: async (lessonId: string): Promise<ApiResponse<LessonProgress>> => {
    const response = await apiClient.post(`${API_ENDPOINTS.PROGRESS.LIST}/complete`, { lessonId });
    return response.data;
  },
};

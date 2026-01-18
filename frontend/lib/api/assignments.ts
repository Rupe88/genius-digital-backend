import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  chapterId?: string;
  lessonId?: string;
  dueDate?: string;
  maxScore: number;
  instructions?: string;
  attachments?: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  submission: string;
  attachments?: string[];
  score?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: string;
}

export interface CreateAssignmentRequest {
  title: string;
  description: string;
  courseId: string;
  chapterId?: string;
  lessonId?: string;
  dueDate?: string;
  maxScore: number;
  instructions?: string;
  attachments?: string[];
  published?: boolean;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  dueDate?: string;
  maxScore?: number;
  instructions?: string;
  attachments?: string[];
  published?: boolean;
}

export interface SubmitAssignmentRequest {
  submission: string;
  attachments?: string[];
}

export interface GradeAssignmentRequest {
  score: number;
  feedback?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Assignments API
 */
export const assignmentsApi = {
  /**
   * Get all assignments (admin only)
   */
  getAll: async (): Promise<ApiResponse<Assignment[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.ASSIGNMENTS.LIST);
    return response.data;
  },

  /**
   * Get assignments for a specific course
   */
  getByCourse: async (courseId: string): Promise<ApiResponse<Assignment[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.ASSIGNMENTS.LIST}/course/${courseId}`);
    return response.data;
  },

  /**
   * Get assignment by ID
   */
  getById: async (id: string): Promise<ApiResponse<Assignment>> => {
    const response = await apiClient.get(API_ENDPOINTS.ASSIGNMENTS.BY_ID(id));
    return response.data;
  },

  /**
   * Create new assignment (admin only)
   */
  create: async (data: CreateAssignmentRequest): Promise<ApiResponse<Assignment>> => {
    const response = await apiClient.post(API_ENDPOINTS.ASSIGNMENTS.LIST, data);
    return response.data;
  },

  /**
   * Update assignment (admin only)
   */
  update: async (id: string, data: UpdateAssignmentRequest): Promise<ApiResponse<Assignment>> => {
    const response = await apiClient.put(API_ENDPOINTS.ASSIGNMENTS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete assignment (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.ASSIGNMENTS.BY_ID(id));
    return response.data;
  },

  /**
   * Submit assignment
   */
  submit: async (id: string, data: SubmitAssignmentRequest): Promise<ApiResponse<AssignmentSubmission>> => {
    const response = await apiClient.post(API_ENDPOINTS.ASSIGNMENTS.SUBMIT(id), data);
    return response.data;
  },

  /**
   * Grade assignment submission (admin only)
   */
  grade: async (assignmentId: string, submissionId: string, data: GradeAssignmentRequest): Promise<ApiResponse<AssignmentSubmission>> => {
    const response = await apiClient.post(`${API_ENDPOINTS.ASSIGNMENTS.BY_ID(assignmentId)}/grade/${submissionId}`, data);
    return response.data;
  },

  /**
   * Get assignment submissions (admin only)
   */
  getSubmissions: async (id: string): Promise<ApiResponse<AssignmentSubmission[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.ASSIGNMENTS.BY_ID(id)}/submissions`);
    return response.data;
  },
};

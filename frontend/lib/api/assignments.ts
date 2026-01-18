import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse } from '@/lib/types/api';

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

/**
 * Get all assignments (admin only)
 */
export const getAllAssignments = async (): Promise<Assignment[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Assignment[]>>(API_ENDPOINTS.ASSIGNMENTS.LIST);
    return handleApiResponse<Assignment[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get assignments for a specific course
 */
export const getAssignmentsByCourse = async (courseId: string): Promise<Assignment[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Assignment[]>>(`${API_ENDPOINTS.ASSIGNMENTS.LIST}/course/${courseId}`);
    return handleApiResponse<Assignment[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get assignment by ID
 */
export const getAssignmentById = async (id: string): Promise<Assignment> => {
  try {
    const response = await apiClient.get<ApiResponse<Assignment>>(API_ENDPOINTS.ASSIGNMENTS.BY_ID(id));
    return handleApiResponse<Assignment>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create new assignment (admin only)
 */
export const createAssignment = async (data: CreateAssignmentRequest): Promise<Assignment> => {
  try {
    const response = await apiClient.post<ApiResponse<Assignment>>(API_ENDPOINTS.ASSIGNMENTS.LIST, data);
    return handleApiResponse<Assignment>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update assignment (admin only)
 */
export const updateAssignment = async (id: string, data: UpdateAssignmentRequest): Promise<Assignment> => {
  try {
    const response = await apiClient.put<ApiResponse<Assignment>>(API_ENDPOINTS.ASSIGNMENTS.BY_ID(id), data);
    return handleApiResponse<Assignment>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete assignment (admin only)
 */
export const deleteAssignment = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.ASSIGNMENTS.BY_ID(id));
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Submit assignment
 */
export const submitAssignment = async (id: string, data: SubmitAssignmentRequest): Promise<AssignmentSubmission> => {
  try {
    const response = await apiClient.post<ApiResponse<AssignmentSubmission>>(API_ENDPOINTS.ASSIGNMENTS.SUBMIT(id), data);
    return handleApiResponse<AssignmentSubmission>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Grade assignment submission (admin only)
 */
export const gradeAssignmentSubmission = async (
  assignmentId: string,
  submissionId: string,
  data: GradeAssignmentRequest
): Promise<AssignmentSubmission> => {
  try {
    const response = await apiClient.post<ApiResponse<AssignmentSubmission>>(
      `${API_ENDPOINTS.ASSIGNMENTS.BY_ID(assignmentId)}/grade/${submissionId}`,
      data
    );
    return handleApiResponse<AssignmentSubmission>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get assignment submissions (admin only)
 */
export const getAssignmentSubmissions = async (id: string): Promise<AssignmentSubmission[]> => {
  try {
    const response = await apiClient.get<ApiResponse<AssignmentSubmission[]>>(`${API_ENDPOINTS.ASSIGNMENTS.BY_ID(id)}/submissions`);
    return handleApiResponse<AssignmentSubmission[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility while components are updated
export const assignmentsApi = {
  getAll: getAllAssignments,
  getByCourse: getAssignmentsByCourse,
  getById: getAssignmentById,
  create: createAssignment,
  update: updateAssignment,
  delete: deleteAssignment,
  submit: submitAssignment,
  grade: gradeAssignmentSubmission,
  getSubmissions: getAssignmentSubmissions,
};

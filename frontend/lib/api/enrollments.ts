import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Enrollment } from '@/lib/types/course';
import { PaginatedResponse, ApiResponse, Pagination } from '@/lib/types/api';

export const getUserEnrollments = async (params?: {
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Enrollment>> => {
  try {
    const response = await apiClient.get<ApiResponse<Enrollment[]> & { pagination: Pagination }>(API_ENDPOINTS.ENROLLMENTS.MY_ENROLLMENTS, {
      params,
    });

    const payload = response.data;
    if (payload.success && payload.data) {
      return {
        data: payload.data,
        pagination: payload.pagination || {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: payload.data.length,
          pages: Math.ceil(payload.data.length / (params?.limit || 10)),
        },
      };
    }
    throw new Error('Failed to fetch user enrollments');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getAllEnrollments = async (params?: {
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  courseId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Enrollment>> => {
  try {
    const response = await apiClient.get<ApiResponse<Enrollment[]> & { pagination: Pagination }>(API_ENDPOINTS.ENROLLMENTS.LIST, {
      params,
    });

    const payload = response.data;
    if (payload.success && payload.data) {
      return {
        data: payload.data,
        pagination: payload.pagination || {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: payload.data.length,
          pages: Math.ceil(payload.data.length / (params?.limit || 10)),
        },
      };
    }
    throw new Error('Failed to fetch enrollments');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const enrollInCourse = async (courseId: string, affiliateCode?: string): Promise<Enrollment> => {
  try {
    const response = await apiClient.post<ApiResponse<Enrollment>>(API_ENDPOINTS.ENROLLMENTS.CREATE, {
      courseId,
      affiliateCode,
    });

    const payload = response.data;
    if (payload.success && payload.data) {
      return payload.data;
    }
    throw new Error('Failed to enroll in course');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getEnrollmentById = async (id: string): Promise<Enrollment> => {
  try {
    const response = await apiClient.get<{ data: Enrollment }>(API_ENDPOINTS.ENROLLMENTS.BY_ID(id));
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const unenrollFromCourse = async (courseId: string): Promise<void> => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.ENROLLMENTS.UNENROLL(courseId));

    // Backend returns: { success: true, message: string }
    const payload = response.data as { success: boolean; message: string };
    if (!payload.success) {
      throw new Error(payload.message || 'Failed to unenroll from course');
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getProgress = async (enrollmentId: string): Promise<unknown> => {
  try {
    const response = await apiClient.get<ApiResponse<unknown>>(API_ENDPOINTS.ENROLLMENTS.PROGRESS(enrollmentId));

    const payload = response.data;
    if (payload.success && payload.data) {
      return payload.data;
    }
    throw new Error('Failed to get progress');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteEnrollment = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.ENROLLMENTS.BY_ID(id));
    const payload = response.data as { success: boolean; message: string };
    if (!payload.success) {
      throw new Error(payload.message || 'Failed to delete enrollment');
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


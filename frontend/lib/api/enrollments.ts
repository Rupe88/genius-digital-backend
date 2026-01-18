import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Enrollment } from '@/lib/types/course';
import { PaginatedResponse } from '@/lib/types/api';

export const getEnrollments = async (params?: {
  page?: number;
  limit?: number;
  courseId?: string;
  userId?: string;
  status?: string;
}): Promise<PaginatedResponse<Enrollment>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ENROLLMENTS.LIST, {
      params,
    });

    // Backend returns: { success, data: Enrollment[], pagination: {...} }
    const data = handleApiResponse<Enrollment[]>(response as any);
    const pagination = (response.data && (response.data as any).pagination) || {
      page: params?.page || 1,
      limit: params?.limit || data.length,
      total: data.length,
      pages: 1,
    };

    return { data, pagination };
  } catch (error) {
    // Surface a clearer message to callers but avoid crashing the whole app
    throw new Error(handleApiError(error));
  }
};

export const enrollInCourse = async (courseId: string, couponCode?: string): Promise<Enrollment> => {
  try {
    const response = await apiClient.post<{ data: Enrollment }>(API_ENDPOINTS.ENROLLMENTS.CREATE, {
      courseId,
      couponCode,
    });
    return handleApiResponse(response);
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

export const getProgress = async (enrollmentId: string): Promise<any> => {
  try {
    const response = await apiClient.get<{ data: any }>(API_ENDPOINTS.ENROLLMENTS.PROGRESS(enrollmentId));
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


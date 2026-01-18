import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Chapter } from '@/lib/types/course';
export type { Chapter };
import { ApiResponse } from '@/lib/types/api';


export interface CreateChapterData {
  courseId: string;
  title: string;
  slug?: string;
  description?: string;
  order?: number;
  isLocked?: boolean;
  isPreview?: boolean;
}

export interface UpdateChapterData extends Partial<CreateChapterData> {
  courseId?: string;
}

export const getCourseChapters = async (courseId: string): Promise<Chapter[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Chapter[]>>(API_ENDPOINTS.CHAPTERS.BY_COURSE(courseId));
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    return handleApiResponse<Chapter[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getChapterById = async (id: string): Promise<Chapter> => {
  try {
    const response = await apiClient.get<ApiResponse<Chapter>>(API_ENDPOINTS.CHAPTERS.BY_ID(id));
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    return handleApiResponse<Chapter>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const createChapter = async (data: CreateChapterData): Promise<Chapter> => {
  try {
    const response = await apiClient.post<ApiResponse<Chapter>>(API_ENDPOINTS.CHAPTERS.LIST, data);
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    throw new Error(responseData.message || 'Failed to create chapter');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateChapter = async (id: string, data: UpdateChapterData): Promise<Chapter> => {
  try {
    const response = await apiClient.put<ApiResponse<Chapter>>(API_ENDPOINTS.CHAPTERS.BY_ID(id), data);
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    throw new Error(responseData.message || 'Failed to update chapter');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteChapter = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse>(API_ENDPOINTS.CHAPTERS.BY_ID(id));
    const responseData = response.data;
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to delete chapter');
    }
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const reorderChapter = async (id: string, order: number): Promise<Chapter> => {
  try {
    const response = await apiClient.post<ApiResponse<Chapter>>(API_ENDPOINTS.CHAPTERS.REORDER(id), { order });
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    throw new Error(responseData.message || 'Failed to reorder chapter');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const toggleChapterLock = async (id: string, isLocked?: boolean): Promise<Chapter> => {
  try {
    const response = await apiClient.post<ApiResponse<Chapter>>(API_ENDPOINTS.CHAPTERS.TOGGLE_LOCK(id), { isLocked });
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    throw new Error(responseData.message || 'Failed to toggle chapter lock');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const toggleChapterPreview = async (id: string, isPreview?: boolean): Promise<Chapter> => {
  try {
    const response = await apiClient.post<ApiResponse<Chapter>>(API_ENDPOINTS.CHAPTERS.TOGGLE_PREVIEW(id), { isPreview });
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    throw new Error(responseData.message || 'Failed to toggle chapter preview');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


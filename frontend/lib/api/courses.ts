import axios from 'axios';
import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Course } from '@/lib/types/course';
import { PaginatedResponse, ApiResponse, Pagination } from '@/lib/types/api';

export const getAllCourses = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  instructorId?: string;
  level?: string;
  status?: string;
}): Promise<PaginatedResponse<Course>> => {
  try {
    const response = await apiClient.get<ApiResponse<Course[]> & { pagination: Pagination }>(API_ENDPOINTS.COURSES.LIST, {
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
          pages: 1,
        },
      };
    }
    throw new Error('Failed to fetch courses');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const filterCourses = async (filters: {
  categoryId?: string;
  instructorId?: string;
  level?: string;
  priceMin?: number;
  priceMax?: number;
  isFree?: boolean;
  featured?: boolean;
  isOngoing?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Course>> => {
  try {
    const response = await apiClient.get<ApiResponse<Course[]> & { pagination: Pagination }>(API_ENDPOINTS.COURSES.FILTER, {
      params: filters,
    });

    const payload = response.data;
    if (payload.success && payload.data) {
      return {
        data: payload.data,
        pagination: payload.pagination || {
          page: filters?.page || 1,
          limit: filters?.limit || 10,
          total: payload.data.length,
          pages: 1,
        },
      };
    }
    throw new Error('Failed to filter courses');
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getOngoingCourses = async (): Promise<Course[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Course[]>>(API_ENDPOINTS.COURSES.ONGOING);
    return handleApiResponse<Course[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getCourseById = async (id: string): Promise<Course> => {
  try {
    const response = await apiClient.get<ApiResponse<Course>>(API_ENDPOINTS.COURSES.BY_ID(id));
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    return handleApiResponse<Course>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export interface CreateCourseData {
  title: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  thumbnail?: string;
  price?: number;
  originalPrice?: number;
  isFree?: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'ONGOING';
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  duration?: number;
  language?: string;
  featured?: boolean;
  isOngoing?: boolean;
  startDate?: string;
  endDate?: string;
  tags?: string;
  learningOutcomes?: string[];
  skills?: string[];
  instructorId: string;
  categoryId?: string;
  videoUrl?: string;
  thumbnailFile?: File;
  onProgress?: (progress: number) => void;
}

export const createCourse = async (data: CreateCourseData): Promise<Course> => {
  try {
    // Update progress: Starting
    data.onProgress?.(10);

    const formData = new FormData();

    // Add all fields to FormData
    formData.append('title', data.title);
    if (data.slug) formData.append('slug', data.slug);
    if (data.description) formData.append('description', data.description);
    if (data.shortDescription) formData.append('shortDescription', data.shortDescription);
    if (data.thumbnail && !data.thumbnailFile) formData.append('thumbnail', data.thumbnail);
    if (data.price !== undefined) formData.append('price', data.price.toString());
    if (data.originalPrice !== undefined) formData.append('originalPrice', data.originalPrice.toString());
    if (data.isFree !== undefined) formData.append('isFree', data.isFree.toString());
    if (data.status) formData.append('status', data.status);
    if (data.level) formData.append('level', data.level);
    if (data.duration !== undefined) formData.append('duration', data.duration.toString());
    if (data.language) formData.append('language', data.language);
    if (data.featured !== undefined) formData.append('featured', data.featured.toString());
    if (data.isOngoing !== undefined) formData.append('isOngoing', data.isOngoing.toString());
    if (data.startDate) formData.append('startDate', data.startDate);
    if (data.endDate) formData.append('endDate', data.endDate);
    if (data.tags) formData.append('tags', data.tags);
    if (data.learningOutcomes && Array.isArray(data.learningOutcomes)) {
      formData.append('learningOutcomes', JSON.stringify(data.learningOutcomes));
    }
    if (data.skills && Array.isArray(data.skills)) {
      formData.append('skills', JSON.stringify(data.skills));
    }
    if (data.videoUrl) formData.append('videoUrl', data.videoUrl);
    formData.append('instructorId', data.instructorId);
    if (data.categoryId) formData.append('categoryId', data.categoryId);

    // Add thumbnail file if provided
    if (data.thumbnailFile) {
      formData.append('thumbnail', data.thumbnailFile);
    }

    // Update progress: Form data prepared
    data.onProgress?.(30);

    // Use longer timeout for course creation (2 minutes due to file upload)
    const response = await apiClient.post<ApiResponse<Course>>(API_ENDPOINTS.COURSES.LIST, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for course creation
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 70) / progressEvent.total) + 30;
          data.onProgress?.(Math.min(percentCompleted, 90));
        }
      },
    });

    // Update progress: Request completed
    data.onProgress?.(100);

    return handleApiResponse<Course>(response);
  } catch (error) {
    // Provide more specific error messages for course creation
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Course creation timed out. The server may be busy. Please try again.');
      }
      if (error.response?.status === 408) {
        throw new Error('Request timed out during file upload. Please try with a smaller image.');
      }
      if (!error.response) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
    }
    throw new Error(handleApiError(error));
  }
};

export const updateCourse = async (id: string, data: Partial<CreateCourseData>): Promise<Course> => {
  try {
    const formData = new FormData();

    // Add all provided fields to FormData
    if (data.title) formData.append('title', data.title);
    if (data.slug) formData.append('slug', data.slug);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.shortDescription !== undefined) formData.append('shortDescription', data.shortDescription);
    if (data.thumbnail && !data.thumbnailFile) formData.append('thumbnail', data.thumbnail);
    if (data.price !== undefined) formData.append('price', data.price.toString());
    if (data.originalPrice !== undefined) formData.append('originalPrice', data.originalPrice.toString());
    if (data.isFree !== undefined) formData.append('isFree', data.isFree.toString());
    if (data.status) formData.append('status', data.status);
    if (data.level) formData.append('level', data.level);
    if (data.duration !== undefined) formData.append('duration', data.duration.toString());
    if (data.language) formData.append('language', data.language);
    if (data.featured !== undefined) formData.append('featured', data.featured.toString());
    if (data.isOngoing !== undefined) formData.append('isOngoing', data.isOngoing.toString());
    if (data.startDate) formData.append('startDate', data.startDate);
    if (data.endDate) formData.append('endDate', data.endDate);
    if (data.tags !== undefined) formData.append('tags', data.tags);
    if (data.videoUrl !== undefined) formData.append('videoUrl', data.videoUrl);

    // Handle learningOutcomes - send as JSON string if array, empty string if undefined/null
    if (data.learningOutcomes !== undefined) {
      if (Array.isArray(data.learningOutcomes) && data.learningOutcomes.length > 0) {
        formData.append('learningOutcomes', JSON.stringify(data.learningOutcomes));
      } else {
        formData.append('learningOutcomes', '');
      }
    }

    // Handle skills - send as JSON string if array, empty string if undefined/null
    if (data.skills !== undefined) {
      if (Array.isArray(data.skills) && data.skills.length > 0) {
        formData.append('skills', JSON.stringify(data.skills));
      } else {
        formData.append('skills', '');
      }
    }

    if (data.instructorId) formData.append('instructorId', data.instructorId);
    if (data.categoryId !== undefined) formData.append('categoryId', data.categoryId || '');

    // Add thumbnail file if provided (only if it's a new file)
    if (data.thumbnailFile) {
      formData.append('thumbnail', data.thumbnailFile);
    }

    const response = await apiClient.put<ApiResponse<Course>>(API_ENDPOINTS.COURSES.BY_ID(id), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return handleApiResponse<Course>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteCourse = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.COURSES.BY_ID(id));
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


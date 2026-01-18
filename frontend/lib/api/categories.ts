import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Category } from '@/lib/types/course';
import { ApiResponse } from '@/lib/types/api';

// Re-export Category type
export type { Category };

export const getAllCategories = async (params?: {
  type?: 'COURSE' | 'BLOG' | 'PRODUCT';
}): Promise<Category[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Category[]>>(API_ENDPOINTS.CATEGORIES.LIST, {
      params,
    });
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    return handleApiResponse<Category[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getCategoryById = async (id: string): Promise<Category> => {
  try {
    const response = await apiClient.get<ApiResponse<Category>>(API_ENDPOINTS.CATEGORIES.BY_ID(id));
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    return handleApiResponse<Category>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  type?: 'COURSE' | 'BLOG' | 'PRODUCT';
  parentId?: string;
  imageFile?: File;
}

export const createCategory = async (data: CreateCategoryData): Promise<Category> => {
  try {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.slug) formData.append('slug', data.slug);
    if (data.description) formData.append('description', data.description);
    if (data.type) formData.append('type', data.type);
    if (data.parentId) formData.append('parentId', data.parentId);
    if (data.image && !data.imageFile) formData.append('image', data.image);
    if (data.imageFile) formData.append('image', data.imageFile);

    const response = await apiClient.post<ApiResponse<Category>>(API_ENDPOINTS.CATEGORIES.LIST, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }

    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to create category');
    }

    return handleApiResponse<Category>(response);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(handleApiError(error));
  }
};

export const updateCategory = async (id: string, data: Partial<CreateCategoryData>): Promise<Category> => {
  try {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.slug) formData.append('slug', data.slug);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.type) formData.append('type', data.type);
    if (data.parentId !== undefined) formData.append('parentId', data.parentId || '');
    if (data.image && !data.imageFile) formData.append('image', data.image);
    if (data.imageFile) formData.append('image', data.imageFile);

    const response = await apiClient.put<ApiResponse<Category>>(API_ENDPOINTS.CATEGORIES.BY_ID(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }

    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to update category');
    }

    return handleApiResponse<Category>(response);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(handleApiError(error));
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(id));
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


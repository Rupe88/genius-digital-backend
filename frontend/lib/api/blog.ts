import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { PaginatedResponse } from '@/lib/types/api';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  authorId: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getBlogs = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<BlogPost>> => {
  try {
    const response = await apiClient.get<{ data: PaginatedResponse<BlogPost> }>(API_ENDPOINTS.BLOG.LIST, {
      params,
    });
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getBlogById = async (id: string): Promise<BlogPost> => {
  try {
    const response = await apiClient.get<{ data: BlogPost }>(API_ENDPOINTS.BLOG.BY_ID(id));
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { PaginatedResponse } from '@/lib/types/api';

export interface Testimonial {
  id: string;
  studentName: string;
  content: string;
  rating: number;
  courseName?: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
}

export const getTestimonials = async (params?: {
  page?: number;
  limit?: number;
  featured?: boolean;
}): Promise<PaginatedResponse<Testimonial>> => {
  try {
    const response = await apiClient.get<{ data: PaginatedResponse<Testimonial> }>(API_ENDPOINTS.TESTIMONIALS.LIST, {
      params,
    });
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getTestimonialById = async (id: string): Promise<Testimonial> => {
  try {
    const response = await apiClient.get<{ data: Testimonial }>(API_ENDPOINTS.TESTIMONIALS.BY_ID(id));
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


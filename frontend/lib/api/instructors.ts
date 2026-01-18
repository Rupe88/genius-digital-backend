
import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { Instructor, SocialLinks } from '@/lib/types/course';
export type { Instructor, SocialLinks };
import { ApiResponse } from '@/lib/types/api';

export const getAllInstructors = async (params?: {
  featured?: boolean;
  search?: string;
}): Promise<{ data: Instructor[] }> => {
  try {
    const response = await apiClient.get<ApiResponse<Instructor[]>>(API_ENDPOINTS.INSTRUCTORS.LIST, { params });
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return { data: responseData.data };
    }
    return handleApiResponse<{ data: Instructor[] }>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getInstructorById = async (id: string): Promise<Instructor> => {
  try {
    const response = await apiClient.get<ApiResponse<Instructor>>(API_ENDPOINTS.INSTRUCTORS.BY_ID(id));
    const responseData = response.data;
    if (responseData.success && responseData.data) {
      return responseData.data;
    }
    return handleApiResponse<Instructor>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export interface CreateInstructorData {
  name: string;
  slug?: string;
  image?: string;
  bio?: string;
  designation?: string;
  specialization?: string;
  email?: string;
  phone?: string;
  socialLinks?: SocialLinks;
  featured?: boolean;
  order?: number;
  commissionRate?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  imageFile?: File;
}

export const createInstructor = async (data: CreateInstructorData): Promise<Instructor> => {
  try {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.slug) formData.append('slug', data.slug);
    if (data.bio) formData.append('bio', data.bio);
    if (data.designation) formData.append('designation', data.designation);
    if (data.specialization) formData.append('specialization', data.specialization);
    if (data.email) formData.append('email', data.email);
    if (data.phone) formData.append('phone', data.phone);
    if (data.socialLinks) formData.append('socialLinks', JSON.stringify(data.socialLinks));
    if (data.featured !== undefined) formData.append('featured', data.featured.toString());
    if (data.order !== undefined) formData.append('order', data.order.toString());
    if (data.commissionRate !== undefined) formData.append('commissionRate', data.commissionRate.toString());
    if (data.bankName) formData.append('bankName', data.bankName);
    if (data.accountNumber) formData.append('accountNumber', data.accountNumber);
    if (data.ifscCode) formData.append('ifscCode', data.ifscCode);
    if (data.panNumber) formData.append('panNumber', data.panNumber);
    if (data.image && !data.imageFile) formData.append('image', data.image);
    if (data.imageFile) formData.append('image', data.imageFile);

    const response = await apiClient.post<ApiResponse<Instructor>>(API_ENDPOINTS.INSTRUCTORS.LIST, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const responseData = response.data;

    // Handle successful response
    if (responseData.success && responseData.data) {
      return responseData.data;
    }

    // Handle error response
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to create instructor');
    }

    // Fallback to handleApiResponse if structure is different
    return handleApiResponse<Instructor>(response);
  } catch (error) {
    // Check if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }

    // Otherwise, format the Object(error).message || 'An error occurred'
    const errorMessage = handleApiError(error);
    throw new Error(errorMessage);
  }
};

export const updateInstructor = async (id: string, data: Partial<CreateInstructorData>): Promise<Instructor> => {
  try {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.slug) formData.append('slug', data.slug);
    if (data.bio !== undefined) formData.append('bio', data.bio);
    if (data.designation !== undefined) formData.append('designation', data.designation);
    if (data.specialization !== undefined) formData.append('specialization', data.specialization);
    if (data.email !== undefined) formData.append('email', data.email);
    if (data.phone !== undefined) formData.append('phone', data.phone);
    if (data.socialLinks !== undefined) formData.append('socialLinks', JSON.stringify(data.socialLinks));
    if (data.featured !== undefined) formData.append('featured', data.featured.toString());
    if (data.order !== undefined) formData.append('order', data.order.toString());
    if (data.commissionRate !== undefined) formData.append('commissionRate', data.commissionRate.toString());
    if (data.bankName !== undefined) formData.append('bankName', data.bankName);
    if (data.accountNumber !== undefined) formData.append('accountNumber', data.accountNumber);
    if (data.ifscCode !== undefined) formData.append('ifscCode', data.ifscCode);
    if (data.panNumber !== undefined) formData.append('panNumber', data.panNumber);
    if (data.image && !data.imageFile) formData.append('image', data.image);
    if (data.imageFile) formData.append('image', data.imageFile);

    const response = await apiClient.put<ApiResponse<Instructor>>(API_ENDPOINTS.INSTRUCTORS.BY_ID(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const responseData = response.data;

    // Handle successful response
    if (responseData.success && responseData.data) {
      return responseData.data;
    }

    // Handle error response
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to update instructor');
    }

    // Fallback to handleApiResponse if structure is different
    return handleApiResponse<Instructor>(response);
  } catch (error) {
    // Check if it's already an Error object
    if (error instanceof Error) {
      throw error;
    }

    // Otherwise, format the Object(error).message || 'An error occurred'
    const errorMessage = handleApiError(error);
    throw new Error(errorMessage);
  }
};

export const deleteInstructor = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.INSTRUCTORS.BY_ID(id));
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface Consultation {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsultationRequest {
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredTime: string;
}

export interface UpdateConsultationStatusRequest {
  status: Consultation['status'];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Consultation API
 */
export const consultationApi = {
  /**
   * Create a new consultation request
   */
  create: async (data: CreateConsultationRequest): Promise<ApiResponse<Consultation>> => {
    const response = await apiClient.post(API_ENDPOINTS.CONSULTATIONS.CREATE, data);
    return response.data;
  },

  /**
   * Get all consultations (admin only)
   */
  getAll: async (): Promise<ApiResponse<Consultation[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.CONSULTATIONS.LIST);
    return response.data;
  },

  /**
   * Get consultation by ID
   */
  getById: async (id: string): Promise<ApiResponse<Consultation>> => {
    const response = await apiClient.get(API_ENDPOINTS.CONSULTATIONS.BY_ID(id));
    return response.data;
  },

  /**
   * Update consultation status (admin only)
   */
  updateStatus: async (id: string, data: UpdateConsultationStatusRequest): Promise<ApiResponse<Consultation>> => {
    const response = await apiClient.patch(API_ENDPOINTS.CONSULTATIONS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete consultation (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.CONSULTATIONS.BY_ID(id));
    return response.data;
  },
};

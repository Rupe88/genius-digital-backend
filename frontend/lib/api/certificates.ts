import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: string;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    fullName: string;
    email: string;
  };
  course?: {
    title: string;
    instructor: {
      name: string;
    };
  };
}

export interface CreateCertificateRequest {
  userId: string;
  courseId: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Certificates API
 */
export const certificatesApi = {
  /**
   * Get all certificates (admin only)
   */
  getAll: async (): Promise<ApiResponse<Certificate[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.CERTIFICATES.LIST);
    return response.data;
  },

  /**
   * Get user's certificates
   */
  getUserCertificates: async (): Promise<ApiResponse<Certificate[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.CERTIFICATES.LIST}/user`);
    return response.data;
  },

  /**
   * Get certificate by ID
   */
  getById: async (id: string): Promise<ApiResponse<Certificate>> => {
    const response = await apiClient.get(API_ENDPOINTS.CERTIFICATES.BY_ID(id));
    return response.data;
  },

  /**
   * Issue certificate (admin only)
   */
  issue: async (data: CreateCertificateRequest): Promise<ApiResponse<Certificate>> => {
    const response = await apiClient.post(API_ENDPOINTS.CERTIFICATES.LIST, data);
    return response.data;
  },

  /**
   * Download certificate
   */
  download: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`${API_ENDPOINTS.CERTIFICATES.BY_ID(id)}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Delete certificate (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.CERTIFICATES.BY_ID(id));
    return response.data;
  },
};

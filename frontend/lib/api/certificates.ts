import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse } from '@/lib/types/api';

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

/**
 * Get all certificates (admin only)
 */
export const getAllCertificates = async (): Promise<Certificate[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Certificate[]>>(API_ENDPOINTS.CERTIFICATES.LIST);
    return handleApiResponse<Certificate[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get user's certificates
 */
export const getUserCertificates = async (): Promise<Certificate[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Certificate[]>>(`${API_ENDPOINTS.CERTIFICATES.LIST}/user`);
    return handleApiResponse<Certificate[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get certificate by ID
 */
export const getCertificateById = async (id: string): Promise<Certificate> => {
  try {
    const response = await apiClient.get<ApiResponse<Certificate>>(API_ENDPOINTS.CERTIFICATES.BY_ID(id));
    return handleApiResponse<Certificate>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Issue certificate (admin only)
 */
export const issueCertificate = async (data: CreateCertificateRequest): Promise<Certificate> => {
  try {
    const response = await apiClient.post<ApiResponse<Certificate>>(API_ENDPOINTS.CERTIFICATES.LIST, data);
    return handleApiResponse<Certificate>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Download certificate
 */
export const downloadCertificate = async (id: string): Promise<Blob> => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.CERTIFICATES.BY_ID(id)}/download`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete certificate (admin only)
 */
export const deleteCertificate = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.CERTIFICATES.BY_ID(id));
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility
export const certificatesApi = {
  getAll: getAllCertificates,
  getUserCertificates,
  getById: getCertificateById,
  issue: issueCertificate,
  download: downloadCertificate,
  delete: deleteCertificate,
};

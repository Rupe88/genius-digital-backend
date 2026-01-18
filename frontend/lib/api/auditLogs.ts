import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse, PaginatedResponse } from '@/lib/types/api';

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: unknown;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  user?: {
    fullName: string;
    email: string;
  };
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all audit logs (admin only)
 */
export const getAllAuditLogs = async (filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> => {
  try {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const url = `${API_ENDPOINTS.AUDIT_LOGS.LIST}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>(url);
    return handleApiResponse<PaginatedResponse<AuditLog>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get audit log by ID (admin only)
 */
export const getAuditLogById = async (id: string): Promise<AuditLog> => {
  try {
    const response = await apiClient.get<ApiResponse<AuditLog>>(`${API_ENDPOINTS.AUDIT_LOGS.LIST}/${id}`);
    return handleApiResponse<AuditLog>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get audit logs for specific user (admin only)
 */
export const getAuditLogsByUser = async (
  userId: string,
  filters?: Omit<AuditLogFilters, 'userId'>
): Promise<PaginatedResponse<AuditLog>> => {
  try {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const url = `${API_ENDPOINTS.AUDIT_LOGS.LIST}/user/${userId}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>(url);
    return handleApiResponse<PaginatedResponse<AuditLog>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility while components are updated
export const auditLogsApi = {
  getAll: getAllAuditLogs,
  getById: getAuditLogById,
  getByUser: getAuditLogsByUser,
};

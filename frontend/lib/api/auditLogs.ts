import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Audit Logs API
 */
export const auditLogsApi = {
  /**
   * Get all audit logs (admin only)
   */
  getAll: async (filters?: AuditLogFilters): Promise<ApiResponse<AuditLog[]>> => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const url = `${API_ENDPOINTS.AUDIT_LOGS.LIST}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get audit log by ID (admin only)
   */
  getById: async (id: string): Promise<ApiResponse<AuditLog>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.AUDIT_LOGS.LIST}/${id}`);
    return response.data;
  },

  /**
   * Get audit logs for specific user (admin only)
   */
  getByUser: async (userId: string, filters?: Omit<AuditLogFilters, 'userId'>): Promise<ApiResponse<AuditLog[]>> => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const url = `${API_ENDPOINTS.AUDIT_LOGS.LIST}/user/${userId}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },
};

import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationRequest {
  userId?: string; // If not provided, sends to all users
  title: string;
  message: string;
  type: Notification['type'];
  actionUrl?: string;
  expiresAt?: string;
}

export interface UpdateNotificationRequest {
  title?: string;
  message?: string;
  type?: Notification['type'];
  actionUrl?: string;
  expiresAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Notifications API
 */
export const notificationsApi = {
  /**
   * Get user's notifications
   */
  getUserNotifications: async (): Promise<ApiResponse<Notification[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST);
    return response.data;
  },

  /**
   * Get all notifications (admin only)
   */
  getAll: async (): Promise<ApiResponse<Notification[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.NOTIFICATIONS.LIST}/admin`);
    return response.data;
  },

  /**
   * Get notification by ID
   */
  getById: async (id: string): Promise<ApiResponse<Notification>> => {
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.BY_ID(id));
    return response.data;
  },

  /**
   * Create new notification (admin only)
   */
  create: async (data: CreateNotificationRequest): Promise<ApiResponse<Notification>> => {
    const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.LIST, data);
    return response.data;
  },

  /**
   * Update notification (admin only)
   */
  update: async (id: string, data: UpdateNotificationRequest): Promise<ApiResponse<Notification>> => {
    const response = await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete notification (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.BY_ID(id));
    return response.data;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string): Promise<ApiResponse<Notification>> => {
    const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<ApiResponse> => {
    const response = await apiClient.post(`${API_ENDPOINTS.NOTIFICATIONS.LIST}/mark-all-read`);
    return response.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.NOTIFICATIONS.LIST}/unread-count`);
    return response.data;
  },
};

import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface Event {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  virtualLink?: string;
  maxAttendees?: number;
  currentAttendees: number;
  price?: number;
  featured: boolean;
  published: boolean;
  imageUrl?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  shortDescription: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  virtualLink?: string;
  maxAttendees?: number;
  price?: number;
  featured?: boolean;
  published?: boolean;
  imageUrl?: string;
  tags?: string[];
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  shortDescription?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  virtualLink?: string;
  maxAttendees?: number;
  price?: number;
  featured?: boolean;
  published?: boolean;
  imageUrl?: string;
  tags?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Events API
 */
export const eventsApi = {
  /**
   * Get all events
   */
  getAll: async (): Promise<ApiResponse<Event[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.EVENTS.LIST);
    return response.data;
  },

  /**
   * Get featured events
   */
  getFeatured: async (): Promise<ApiResponse<Event[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.EVENTS.LIST}/featured`);
    return response.data;
  },

  /**
   * Get upcoming events
   */
  getUpcoming: async (): Promise<ApiResponse<Event[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.EVENTS.LIST}/upcoming`);
    return response.data;
  },

  /**
   * Get event by ID
   */
  getById: async (id: string): Promise<ApiResponse<Event>> => {
    const response = await apiClient.get(API_ENDPOINTS.EVENTS.BY_ID(id));
    return response.data;
  },

  /**
   * Create new event (admin only)
   */
  create: async (data: CreateEventRequest): Promise<ApiResponse<Event>> => {
    const response = await apiClient.post(API_ENDPOINTS.EVENTS.LIST, data);
    return response.data;
  },

  /**
   * Update event (admin only)
   */
  update: async (id: string, data: UpdateEventRequest): Promise<ApiResponse<Event>> => {
    const response = await apiClient.put(API_ENDPOINTS.EVENTS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete event (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.EVENTS.BY_ID(id));
    return response.data;
  },

  /**
   * Register for event
   */
  register: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.post(`${API_ENDPOINTS.EVENTS.BY_ID(id)}/register`);
    return response.data;
  },

  /**
   * Unregister from event
   */
  unregister: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.post(`${API_ENDPOINTS.EVENTS.BY_ID(id)}/unregister`);
    return response.data;
  },
};

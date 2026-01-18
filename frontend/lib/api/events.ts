import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse } from '@/lib/types/api';

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

/**
 * Get all events
 */
export const getAllEvents = async (): Promise<Event[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Event[]>>(API_ENDPOINTS.EVENTS.LIST);
    return handleApiResponse<Event[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get featured events
 */
export const getFeaturedEvents = async (): Promise<Event[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Event[]>>(`${API_ENDPOINTS.EVENTS.LIST}/featured`);
    return handleApiResponse<Event[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get upcoming events
 */
export const getUpcomingEvents = async (): Promise<Event[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Event[]>>(`${API_ENDPOINTS.EVENTS.LIST}/upcoming`);
    return handleApiResponse<Event[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get event by ID
 */
export const getEventById = async (id: string): Promise<Event> => {
  try {
    const response = await apiClient.get<ApiResponse<Event>>(API_ENDPOINTS.EVENTS.BY_ID(id));
    return handleApiResponse<Event>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create new event (admin only)
 */
export const createEvent = async (data: CreateEventRequest): Promise<Event> => {
  try {
    const response = await apiClient.post<ApiResponse<Event>>(API_ENDPOINTS.EVENTS.LIST, data);
    return handleApiResponse<Event>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update event (admin only)
 */
export const updateEvent = async (id: string, data: UpdateEventRequest): Promise<Event> => {
  try {
    const response = await apiClient.put<ApiResponse<Event>>(API_ENDPOINTS.EVENTS.BY_ID(id), data);
    return handleApiResponse<Event>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete event (admin only)
 */
export const deleteEvent = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.EVENTS.BY_ID(id));
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Register for event
 */
export const registerForEvent = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.post<ApiResponse<void>>(`${API_ENDPOINTS.EVENTS.BY_ID(id)}/register`);
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Unregister from event
 */
export const unregisterFromEvent = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.post<ApiResponse<void>>(`${API_ENDPOINTS.EVENTS.BY_ID(id)}/unregister`);
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility
export const eventsApi = {
  getAll: getAllEvents,
  getFeatured: getFeaturedEvents,
  getUpcoming: getUpcomingEvents,
  getById: getEventById,
  create: createEvent,
  update: updateEvent,
  delete: deleteEvent,
  register: registerForEvent,
  unregister: unregisterFromEvent,
};

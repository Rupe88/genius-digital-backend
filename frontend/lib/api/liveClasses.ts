import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { PaginatedResponse, ApiResponse } from '@/lib/types/api';

export interface LiveClass {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  instructorId: string;
  scheduledAt: string;
  duration: number;
  meetingUrl?: string;
  meetingId?: string;
  meetingPassword?: string;
  meetingProvider?: string;
  zoomMeetingId?: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  autoGenerateMeeting?: boolean;
  recordingUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  instructor?: {
    id: string;
    name: string;
    email?: string;
  };
  course?: {
    id: string;
    title: string;
  };
}

export const getAllLiveClasses = async (params?: {
  status?: string;
  instructorId?: string;
  courseId?: string;
  upcoming?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<LiveClass>> => {
  try {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<LiveClass>>>(API_ENDPOINTS.LIVE_CLASSES.LIST, { params });
    return handleApiResponse<PaginatedResponse<LiveClass>>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getLiveClassById = async (id: string): Promise<LiveClass> => {
  try {
    const response = await apiClient.get<ApiResponse<LiveClass>>(API_ENDPOINTS.LIVE_CLASSES.BY_ID(id));
    const data = handleApiResponse<LiveClass>(response);
    return data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const createLiveClass = async (liveClassData: Partial<LiveClass>): Promise<LiveClass> => {
  try {
    const response = await apiClient.post<ApiResponse<LiveClass>>(API_ENDPOINTS.LIVE_CLASSES.LIST, liveClassData);
    const data = handleApiResponse<LiveClass>(response);
    return data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateLiveClass = async (id: string, liveClassData: Partial<LiveClass>): Promise<LiveClass> => {
  try {
    const response = await apiClient.put<ApiResponse<LiveClass>>(API_ENDPOINTS.LIVE_CLASSES.BY_ID(id), liveClassData);
    const data = handleApiResponse<LiveClass>(response);
    return data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteLiveClass = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.LIVE_CLASSES.BY_ID(id));
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


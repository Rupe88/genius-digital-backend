import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryItemRequest {
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  featured?: boolean;
  published?: boolean;
}

export interface UpdateGalleryItemRequest {
  title?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  featured?: boolean;
  published?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Gallery API
 */
export const galleryApi = {
  /**
   * Get all gallery items
   */
  getAll: async (): Promise<ApiResponse<GalleryItem[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.GALLERY.LIST);
    return response.data;
  },

  /**
   * Get gallery item by ID
   */
  getById: async (id: string): Promise<ApiResponse<GalleryItem>> => {
    const response = await apiClient.get(API_ENDPOINTS.GALLERY.BY_ID(id));
    return response.data;
  },

  /**
   * Create new gallery item (admin only)
   */
  create: async (data: CreateGalleryItemRequest): Promise<ApiResponse<GalleryItem>> => {
    const response = await apiClient.post(API_ENDPOINTS.GALLERY.LIST, data);
    return response.data;
  },

  /**
   * Update gallery item (admin only)
   */
  update: async (id: string, data: UpdateGalleryItemRequest): Promise<ApiResponse<GalleryItem>> => {
    const response = await apiClient.put(API_ENDPOINTS.GALLERY.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete gallery item (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.GALLERY.BY_ID(id));
    return response.data;
  },
};

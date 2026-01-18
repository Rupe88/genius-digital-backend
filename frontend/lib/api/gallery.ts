import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse } from '@/lib/types/api';

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

/**
 * Get all gallery items
 */
export const getAllGalleryItems = async (): Promise<GalleryItem[]> => {
  try {
    const response = await apiClient.get<ApiResponse<GalleryItem[]>>(API_ENDPOINTS.GALLERY.LIST);
    return handleApiResponse<GalleryItem[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get gallery item by ID
 */
export const getGalleryItemById = async (id: string): Promise<GalleryItem> => {
  try {
    const response = await apiClient.get<ApiResponse<GalleryItem>>(API_ENDPOINTS.GALLERY.BY_ID(id));
    return handleApiResponse<GalleryItem>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create new gallery item (admin only)
 */
export const createGalleryItem = async (data: CreateGalleryItemRequest): Promise<GalleryItem> => {
  try {
    const response = await apiClient.post<ApiResponse<GalleryItem>>(API_ENDPOINTS.GALLERY.LIST, data);
    return handleApiResponse<GalleryItem>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update gallery item (admin only)
 */
export const updateGalleryItem = async (id: string, data: UpdateGalleryItemRequest): Promise<GalleryItem> => {
  try {
    const response = await apiClient.put<ApiResponse<GalleryItem>>(API_ENDPOINTS.GALLERY.BY_ID(id), data);
    return handleApiResponse<GalleryItem>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Delete gallery item (admin only)
 */
export const deleteGalleryItem = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.GALLERY.BY_ID(id));
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility
export const galleryApi = {
  getAll: getAllGalleryItems,
  getById: getGalleryItemById,
  create: createGalleryItem,
  update: updateGalleryItem,
  delete: deleteGalleryItem,
};

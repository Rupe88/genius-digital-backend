import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse } from '@/lib/types/api';

export interface WishlistItem {
  id: string;
  userId: string;
  courseId?: string;
  productId?: string;
  createdAt: string;
  course?: {
    id: string;
    title: string;
    shortDescription: string;
    price: number;
    originalPrice?: number;
    featuredImage: string;
    instructor: {
      name: string;
    };
  };
  product?: {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    images: string[];
  };
}

export interface AddToWishlistRequest {
  courseId?: string;
  productId?: string;
}

/**
 * Get user's wishlist
 */
export const getWishlist = async (): Promise<WishlistItem[]> => {
  try {
    const response = await apiClient.get<ApiResponse<WishlistItem[]>>(API_ENDPOINTS.WISHLIST.LIST);
    return handleApiResponse<WishlistItem[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Add item to wishlist
 */
export const addToWishlist = async (data: AddToWishlistRequest): Promise<WishlistItem> => {
  try {
    const response = await apiClient.post<ApiResponse<WishlistItem>>(API_ENDPOINTS.WISHLIST.ADD, data);
    return handleApiResponse<WishlistItem>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Remove item from wishlist
 */
export const removeFromWishlist = async (id: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<void>>(API_ENDPOINTS.WISHLIST.REMOVE(id));
    handleApiResponse<void>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Check if item is in wishlist
 */
export const checkInWishlist = async (
  courseId?: string,
  productId?: string
): Promise<{ inWishlist: boolean; wishlistItem?: WishlistItem }> => {
  try {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (productId) params.append('productId', productId);

    const url = `${API_ENDPOINTS.WISHLIST.LIST}/check${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<ApiResponse<{ inWishlist: boolean; wishlistItem?: WishlistItem }>>(url);
    return handleApiResponse<{ inWishlist: boolean; wishlistItem?: WishlistItem }>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility
export const wishlistApi = {
  getWishlist: getWishlist,
  addToWishlist: addToWishlist,
  removeFromWishlist: removeFromWishlist,
  checkInWishlist: checkInWishlist,
};

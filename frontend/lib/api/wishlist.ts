import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Wishlist API
 */
export const wishlistApi = {
  /**
   * Get user's wishlist
   */
  getWishlist: async (): Promise<ApiResponse<WishlistItem[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.WISHLIST.LIST);
    return response.data;
  },

  /**
   * Add item to wishlist
   */
  addToWishlist: async (data: AddToWishlistRequest): Promise<ApiResponse<WishlistItem>> => {
    const response = await apiClient.post(API_ENDPOINTS.WISHLIST.ADD, data);
    return response.data;
  },

  /**
   * Remove item from wishlist
   */
  removeFromWishlist: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.WISHLIST.REMOVE(id));
    return response.data;
  },


  /**
   * Check if item is in wishlist
   */
  checkInWishlist: async (courseId?: string, productId?: string): Promise<ApiResponse<{ inWishlist: boolean; wishlistItem?: WishlistItem }>> => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (productId) params.append('productId', productId);

    const url = `${API_ENDPOINTS.WISHLIST.LIST}/check${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },
};

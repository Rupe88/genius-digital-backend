import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';

export interface CartItem {
  id: string;
  courseId?: string;
  productId?: string;
  quantity: number;
  price: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  subtotal: number;
  discount: number;
  couponCode?: string;
}

export const getCart = async (): Promise<Cart> => {
  try {
    const response = await apiClient.get<{ data: Cart }>(API_ENDPOINTS.CART.GET);
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const addToCart = async (courseId: string, productId?: string): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.CART.ADD, { courseId, productId });
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const removeFromCart = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.CART.REMOVE(id));
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const clearCart = async (): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.CART.CLEAR);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const applyCoupon = async (code: string): Promise<Cart> => {
  try {
    const response = await apiClient.post<{ data: Cart }>(API_ENDPOINTS.CART.APPLY_COUPON, { code });
    return handleApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


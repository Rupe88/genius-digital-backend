import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    images: string[];
  };
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    fullName: string;
    email: string;
  };
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  couponCode?: string;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: Order['status'];
  trackingNumber?: string;
  notes?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Orders API
 */
export const ordersApi = {
  /**
   * Get user's orders
   */
  getUserOrders: async (): Promise<ApiResponse<Order[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.LIST);
    return response.data;
  },

  /**
   * Get all orders (admin only)
   */
  getAll: async (): Promise<ApiResponse<Order[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.ORDERS.LIST}/admin`);
    return response.data;
  },

  /**
   * Get order by ID
   */
  getById: async (id: string): Promise<ApiResponse<Order>> => {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(id));
    return response.data;
  },

  /**
   * Create new order
   */
  create: async (data: CreateOrderRequest): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post(API_ENDPOINTS.ORDERS.LIST, data);
    return response.data;
  },

  /**
   * Update order status (admin only)
   */
  updateStatus: async (id: string, data: UpdateOrderStatusRequest): Promise<ApiResponse<Order>> => {
    const response = await apiClient.put(`${API_ENDPOINTS.ORDERS.BY_ID(id)}/status`, data);
    return response.data;
  },

  /**
   * Cancel order
   */
  cancel: async (id: string): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post(`${API_ENDPOINTS.ORDERS.BY_ID(id)}/cancel`);
    return response.data;
  },
};

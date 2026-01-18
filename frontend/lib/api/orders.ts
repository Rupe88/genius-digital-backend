import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { ApiResponse } from '@/lib/types/api';

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

/**
 * Get user's orders
 */
export const getUserOrders = async (): Promise<Order[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Order[]>>(API_ENDPOINTS.ORDERS.LIST);
    return handleApiResponse<Order[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get all orders (admin only)
 */
export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Order[]>>(`${API_ENDPOINTS.ORDERS.LIST}/admin`);
    return handleApiResponse<Order[]>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (id: string): Promise<Order> => {
  try {
    const response = await apiClient.get<ApiResponse<Order>>(API_ENDPOINTS.ORDERS.BY_ID(id));
    return handleApiResponse<Order>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Create new order
 */
export const createOrder = async (data: CreateOrderRequest): Promise<Order> => {
  try {
    const response = await apiClient.post<ApiResponse<Order>>(API_ENDPOINTS.ORDERS.LIST, data);
    return handleApiResponse<Order>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Update order status (admin only)
 */
export const updateOrderStatus = async (id: string, data: UpdateOrderStatusRequest): Promise<Order> => {
  try {
    const response = await apiClient.put<ApiResponse<Order>>(`${API_ENDPOINTS.ORDERS.BY_ID(id)}/status`, data);
    return handleApiResponse<Order>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Cancel order
 */
export const cancelOrder = async (id: string): Promise<Order> => {
  try {
    const response = await apiClient.post<ApiResponse<Order>>(`${API_ENDPOINTS.ORDERS.BY_ID(id)}/cancel`);
    return handleApiResponse<Order>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// For backward compatibility
export const ordersApi = {
  getUserOrders,
  getAll: getAllOrders,
  getById: getOrderById,
  create: createOrder,
  updateStatus: updateOrderStatus,
  cancel: cancelOrder,
};

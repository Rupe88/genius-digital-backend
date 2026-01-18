import { apiClient } from './axios';
import { API_ENDPOINTS } from '../utils/constants';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  category: string;
  images: string[];
  featured: boolean;
  published: boolean;
  stockQuantity: number;
  sku?: string;
  status?: string;

  // Vastu specific fields
  productType?: string;
  vastuPurpose?: string;
  energyType?: string;
  material?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  category: string;
  images?: string[];
  featured?: boolean;
  published?: boolean;
  stockQuantity: number;
  sku?: string;
  status?: string;

  // Vastu specific fields
  productType?: string;
  vastuPurpose?: string;
  energyType?: string;
  material?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  category?: string;
  images?: string[];
  featured?: boolean;
  published?: boolean;
  stockQuantity?: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];

  // Vastu specific fields
  productType?: string;
  vastuPurpose?: string;
  energyType?: string;
  material?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Products API
 */
export const productsApi = {
  /**
   * Get all products
   */
  getAll: async (): Promise<ApiResponse<Product[]>> => {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST);
    return response.data;
  },

  /**
   * Get featured products
   */
  getFeatured: async (): Promise<ApiResponse<Product[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.PRODUCTS.LIST}/featured`);
    return response.data;
  },

  /**
   * Get products by category
   */
  getByCategory: async (category: string): Promise<ApiResponse<Product[]>> => {
    const response = await apiClient.get(`${API_ENDPOINTS.PRODUCTS.LIST}/category/${category}`);
    return response.data;
  },

  /**
   * Get product by ID
   */
  getById: async (id: string): Promise<ApiResponse<Product>> => {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(id));
    return response.data;
  },

  /**
   * Create new product (admin only)
   */
  create: async (data: CreateProductRequest): Promise<ApiResponse<Product>> => {
    const response = await apiClient.post(API_ENDPOINTS.PRODUCTS.LIST, data);
    return response.data;
  },

  /**
   * Update product (admin only)
   */
  update: async (id: string, data: UpdateProductRequest): Promise<ApiResponse<Product>> => {
    const response = await apiClient.put(API_ENDPOINTS.PRODUCTS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete product (admin only)
   */
  delete: async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(id));
    return response.data;
  },
};

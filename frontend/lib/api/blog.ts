import { apiClient } from './axios';

// Matches Prisma Model
export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  authorId: string;
  author?: {
    id: string;
    fullName: string;
    profileImage: string;
  };
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured: boolean;
  views: number;
  tags?: string;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListResponse {
  success: boolean;
  data: Blog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const blogsApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get<BlogListResponse>('/blogs', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<{ success: boolean; data: Blog }>(`/blogs/${id}`);
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await apiClient.post<{ success: boolean; data: Blog }>('/blogs', data);
    return response.data;
  },

  update: async (id: string, data: FormData) => {
    const response = await apiClient.put<{ success: boolean; data: Blog }>(`/blogs/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/blogs/${id}`);
    return response.data;
  },
};

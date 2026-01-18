import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import { PaginatedResponse } from '@/lib/types/api';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

export const subscribeNewsletter = async (email: string): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.NEWSLETTER.SUBSCRIBE, { email });
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getAllSubscribers = async (params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<NewsletterSubscriber>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.NEWSLETTER.LIST, {
      params,
    });
    return handleApiResponse<PaginatedResponse<NewsletterSubscriber>>(response as any);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


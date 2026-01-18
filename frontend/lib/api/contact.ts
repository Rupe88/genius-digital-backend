import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';

export interface ContactSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const submitContact = async (data: ContactSubmission): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.CONTACT.CREATE, data);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


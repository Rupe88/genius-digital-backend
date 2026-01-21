import { apiClient } from './axios';

export interface Popup {
    id: string;
    title: string;
    imageUrl: string;
    linkUrl?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export const popupsApi = {
    /**
     * Get active popup for public
     */
    getActive: async () => {
        const response = await apiClient.get<{ success: boolean; data: Popup | null }>('/popups/active');
        return response.data;
    },

    /**
     * Get all popups (Admin)
     */
    getAll: async () => {
        const response = await apiClient.get<{ success: boolean; data: Popup[] }>('/popups');
        return response.data;
    },

    /**
     * Create popup (Admin)
     * data can be FormData
     */
    create: async (data: FormData) => {
        const response = await apiClient.post<{ success: boolean; data: Popup }>('/popups', data);
        return response.data;
    },

    /**
     * Update popup (Admin)
     * data can be FormData
     */
    update: async (id: string, data: FormData) => {
        const response = await apiClient.put<{ success: boolean; data: Popup }>(`/popups/${id}`, data);
        return response.data;
    },

    /**
     * Delete popup (Admin)
     */
    delete: async (id: string) => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/popups/${id}`);
        return response.data;
    },
};

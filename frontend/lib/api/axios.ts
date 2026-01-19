
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiError, ApiResponse } from '@/lib/types/api';
import { shouldRefreshToken, isTokenExpired } from '@/lib/utils/tokenUtils';

// Use environment variable for API URL, with smart fallbacks
const API_URL = process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'aacharyarajbabu.vercel.app'
    ? 'https://goldfish-app-d9t4j.ondigitalocean.app/api'  // Replace with your actual production backend URL
    : 'http://localhost:4000/api'
  );

// Flag to prevent multiple simultaneous refresh requests
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};


const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Create axios instance with different timeouts for different operations
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Keep enabled for authenticated requests
  timeout: 60000, // 60 seconds default timeout (increased for file uploads)
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      // Skip token for auth endpoints (they don't need tokens)
      const isAuthEndpoint = config.url?.includes('/auth/register') ||
        config.url?.includes('/auth/login') ||
        config.url?.includes('/auth/verify-otp') ||
        config.url?.includes('/auth/resend-otp') ||
        config.url?.includes('/auth/forgot-password') ||
        config.url?.includes('/auth/reset-password') ||
        config.url?.includes('/auth/refresh-token');

      const token = localStorage.getItem('accessToken');

      // Only add token if it exists and we're not on auth endpoints
      if (!isAuthEndpoint && token) {
        if (config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // If we're already on an auth page, don't try to refresh
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthPage =
        pathname.includes('/login') ||
        pathname.includes('/register') ||
        pathname.includes('/verify-otp') ||
        pathname.includes('/forgot-password') ||
        pathname.includes('/reset-password');

      // If it's a 401 on the refresh-token endpoint itself, or on an auth page, logout
      if (originalRequest.url?.includes('/auth/refresh-token') || isAuthPage) {
        handleLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      if (refreshToken) {
        try {
          console.log('Attempting to refresh token...');
          // Using axios directly to avoid interceptor issues
          const response = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });

          if (response.data && response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;

            if (typeof window !== 'undefined') {
              localStorage.setItem('accessToken', accessToken);
              if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken);
              }
            }

            apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

            isRefreshing = false;
            onTokenRefreshed(accessToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }

            console.log('Token refreshed successfully, retrying original request');
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          isRefreshing = false;
          handleLogout();
          return Promise.reject(refreshError);
        }
      } else {
        handleLogout();
      }
    }

    // Default handle for other errors or if refresh logic skipped
    if (error.response?.status === 401) {
      handleLogout();
    }

    // Handle 429 Too Many Requests - Rate limiting
    if (error.response?.status === 429) {
      const errorMessage = error.response?.data?.message || 'Too many requests. Please try again later.';
      return Promise.reject(new Error(errorMessage));
    }

    // Handle other errors
    const apiError: ApiError = {
      success: false,
      message: error.response?.data?.message || (Object(error).message || 'An error occurred'),
      errors: error.response?.data?.errors,
    };

    return Promise.reject(apiError);
  }
);

// Helper function to handle logout and redirection
const handleLogout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Only redirect if not already on a login page (prevent loop)
    const pathname = window.location.pathname;
    const isAuthPage =
      pathname.includes('/login') ||
      pathname.includes('/register') ||
      pathname.includes('/verify-otp') ||
      pathname.includes('/forgot-password') ||
      pathname.includes('/reset-password');

    if (!isAuthPage) {
      const isAdminRoute = pathname.startsWith('/admin');
      window.location.href = isAdminRoute ? '/admin/login' : '/login';
    }
  }
};


// Helper function to handle API responses
export const handleApiResponse = <T>(response: { data: unknown }): T => {
  const payload = response.data as ApiResponse<T>;
  if (payload.success && payload.data) {
    return payload.data;
  }
  throw new Error(payload.message || 'API request failed');
};

// Helper function to handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    if (apiError?.message) {
      return apiError.message;
    }
    if (error.message) {
      return error.message;
    }
    return `Request failed with status ${error.response?.status || 'unknown'}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};


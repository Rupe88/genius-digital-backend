import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiError, ApiResponse } from '@/lib/types/api';
import { shouldRefreshToken, isTokenExpired } from '@/lib/utils/tokenUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Keep enabled for authenticated requests
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor - Add auth token and proactively refresh if needed
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      // Skip token refresh for auth endpoints (they don't need tokens)
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

      // Temporarily disable proactive token refresh to test
      // TODO: Re-enable token refresh logic after fixing the hanging issue
      // const refreshTokenValue = localStorage.getItem('refreshToken');

      // Proactively refresh token if it's about to expire (within 2 minutes)
      // But skip on auth endpoints and if already refreshing
      // if (!isAuthEndpoint && token && refreshTokenValue && shouldRefreshToken(token) && !isRefreshing) {
      //   try {
      //     isRefreshing = true;
      //     const response = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      //       `${API_URL}/auth/refresh-token`,
      //       { refreshToken: refreshTokenValue }
      //     );

      //     if (response.data.success && response.data.data) {
      //       const newAccessToken = response.data.data.accessToken;
      //       const newRefreshToken = response.data.data.refreshToken || refreshTokenValue;

      //       localStorage.setItem('accessToken', newAccessToken);
      //       if (newRefreshToken) {
      //         localStorage.setItem('refreshToken', newRefreshToken);
      //       }

      //       // Notify all waiting requests
      //       onTokenRefreshed(newAccessToken);

      //       // Use new token for this request
      //       if (config.headers) {
      //         config.headers.Authorization = `Bearer ${newAccessToken}`;
      //       }
      //     }
      //   } catch (error) {
      //     // Refresh failed, but continue with original request
      //     // It will fail with 401 and trigger the response interceptor
      //     console.error('Token refresh failed:', error);
      //   } finally {
      //     isRefreshing = false;
      //   }
      // } else if (token && config.headers) {
      //   // If refresh is in progress, wait for it
      //   if (isRefreshing) {
      //     return new Promise((resolve) => {
      //       addRefreshSubscriber((newToken: string) => {
      //         if (config.headers) {
      //           config.headers.Authorization = `Bearer ${newToken}`;
      //         }
      //         resolve(config);
      //       });
      //     });
      //   }
      //   config.headers.Authorization = `Bearer ${token}`;
      // }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip token refresh for auth endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/auth/register') ||
                          originalRequest.url?.includes('/auth/login') ||
                          originalRequest.url?.includes('/auth/verify-otp') ||
                          originalRequest.url?.includes('/auth/resend-otp') ||
                          originalRequest.url?.includes('/auth/forgot-password') ||
                          originalRequest.url?.includes('/auth/reset-password') ||
                          originalRequest.url?.includes('/auth/refresh-token');

    // Handle 401 Unauthorized - Token expired or invalid (skip for auth endpoints)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const refreshTokenValue = localStorage.getItem('refreshToken');

      // If already refreshing, wait for it
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;

      if (refreshTokenValue) {
        try {
          isRefreshing = true;
          const response = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
            `${API_URL}/auth/refresh-token`,
            { refreshToken: refreshTokenValue }
          );

          if (response.data.success && response.data.data) {
            const newAccessToken = response.data.data.accessToken;
            const newRefreshToken = response.data.data.refreshToken || refreshTokenValue;

            localStorage.setItem('accessToken', newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }

            // Notify all waiting requests
            onTokenRefreshed(newAccessToken);

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            isRefreshing = false;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          isRefreshing = false;
          // Refresh failed - logout user
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
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token - logout user
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
        return Promise.reject(error);
      }
    }

    // Handle 429 Too Many Requests - Rate limiting
    if (error.response?.status === 429) {
      const errorMessage = error.response?.data?.message || 'Too many requests. Please try again later.';
      return Promise.reject(new Error(errorMessage));
    }

    // Handle other errors
    const apiError: ApiError = {
      success: false,
      message: error.response?.data?.message || error.message || 'An error occurred',
      errors: error.response?.data?.errors,
    };

    return Promise.reject(apiError);
  }
);

// Helper function to handle API responses
export const handleApiResponse = <T>(response: { data: any }): T => {
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
    if (error.response?.data?.message) {
      return error.response.data.message;
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


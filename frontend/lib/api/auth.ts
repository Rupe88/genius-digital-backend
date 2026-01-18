import { apiClient, handleApiResponse, handleApiError } from './axios';
import { API_ENDPOINTS } from '@/lib/utils/constants';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  VerifyOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
  User,
} from '@/lib/types/auth';
import { ApiResponse } from '@/lib/types/api';

export const register = async (data: RegisterRequest): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const verifyOtp = async (data: VerifyOtpRequest): Promise<AuthResponse['data']> => {
  try {
    const response = await apiClient.post<ApiResponse<AuthResponse['data']>>(API_ENDPOINTS.AUTH.VERIFY_OTP, data);
    return handleApiResponse<AuthResponse['data']>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const resendOtp = async (email: string): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH.RESEND_OTP, { email });
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const login = async (credentials: LoginRequest): Promise<AuthResponse['data']> => {
  try {
    const response = await apiClient.post<ApiResponse<AuthResponse['data']>>(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return handleApiResponse<AuthResponse['data']>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const refreshToken = async (data: RefreshTokenRequest): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, data);
    return handleApiResponse<{ accessToken: string; refreshToken: string }>(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const forgotPassword = async (data: ForgotPasswordRequest): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const resetPassword = async (data: ResetPasswordRequest): Promise<void> => {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getMe = async (): Promise<User> => {
  try {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(API_ENDPOINTS.AUTH.ME);
    const data = handleApiResponse<{ user: User }>(response);
    return data.user;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getProfile = async (): Promise<User> => {
  try {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(API_ENDPOINTS.AUTH.PROFILE);
    const data = handleApiResponse<{ user: User }>(response);
    return data.user;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updatePaymentPreference = async (preferredPaymentMethod: string): Promise<void> => {
  try {
    await apiClient.put(API_ENDPOINTS.AUTH.UPDATE_PAYMENT_PREFERENCE, { preferredPaymentMethod });
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};


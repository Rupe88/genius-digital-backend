'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, LoginRequest, RegisterRequest, VerifyOtpRequest } from '@/lib/types/auth';
import * as authApi from '@/lib/api/auth';
import { shouldRefreshToken, getTimeUntilExpiry } from '@/lib/utils/tokenUtils';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  verifyOtp: (data: VerifyOtpRequest) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Skip token refresh if we're on auth pages (login, register, verify-otp, etc.)
    const pathname = window.location.pathname;
    const isAuthPage =
      pathname.includes('/login') ||
      pathname.includes('/register') ||
      pathname.includes('/verify-otp') ||
      pathname.includes('/forgot-password') ||
      pathname.includes('/reset-password');

    if (isAuthPage) {
      return; // Don't refresh tokens on auth pages
    }

    const accessToken = localStorage.getItem('accessToken');
    const refreshTokenValue = localStorage.getItem('refreshToken');

    if (!accessToken || !refreshTokenValue) {
      return;
    }

    // Check if token needs refresh (expires within 2 minutes)
    if (shouldRefreshToken(accessToken)) {
      try {
        const response = await authApi.refreshToken({ refreshToken: refreshTokenValue });
        localStorage.setItem('accessToken', response.accessToken);
        // Always update refreshToken if provided (backend always returns it now)
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        console.log('Token refreshed successfully');
      } catch (error) {
        // Refresh failed - clear tokens and logout
        console.error('Token refresh failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        // Redirect to login if not already there (prevent loop)
        const isAdminRoute = pathname.startsWith('/admin');
        if (!isAuthPage) {
          window.location.href = isAdminRoute ? '/admin/login' : '/login';
        }
      }
    }
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Only set up refresh if we have a logged-in user
    if (user) {
      // Set up interval to check token every minute
      refreshIntervalRef.current = setInterval(() => {
        refreshAccessToken();
      }, 1 * 60 * 1000); // Check every minute
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [user]); // Removed refreshAccessToken from deps to prevent re-renders

  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      // Check if we're on an auth page - skip initialization on auth pages
      const pathname = window.location.pathname;
      const isAuthPage =
        pathname.includes('/login') ||
        pathname.includes('/register') ||
        pathname.includes('/verify-otp') ||
        pathname.includes('/forgot-password') ||
        pathname.includes('/reset-password');

      // On auth pages, just set loading to false without checking tokens
      if (isAuthPage) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          await refreshUser();
        } catch {
          // Token is invalid, clear it silently (don't redirect if on auth page)
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    initializeAuth();
  }, [refreshUser]);

  const login = async (credentials: LoginRequest) => {
    console.log('AuthContext.login called with:', { email: credentials.email, password: '***' });
    const response = await authApi.login(credentials);
    console.log('AuthContext.login response received:', response);
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    setUser(response.user);
    console.log('AuthContext.login completed, user set');
  };

  const register = async (data: RegisterRequest) => {
    await authApi.register(data);
  };

  const verifyOtp = async (data: VerifyOtpRequest) => {
    const response = await authApi.verifyOtp(data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    setUser(response.user);
  };

  const resendOtp = async (email: string) => {
    await authApi.resendOtp(email);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue with logout even if API call fails
    } finally {
      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/context/AuthContext';
import * as authApi from '@/lib/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/lib/utils/constants';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      setIsLoading(true);
      
      // Use context login which handles token storage and state update
      await login(data);
      
      // Get user from response or wait for context to update
      // Check user role - if not admin, logout and show error
      setTimeout(async () => {
        try {
          // Get fresh user data to verify admin role
          const userData = await authApi.getMe();
          
          if (userData?.role !== 'ADMIN') {
            setError('Access denied. Admin privileges required.');
            // Remove tokens and logout
            await logout();
            setIsLoading(false);
            return;
          }
          
          // Redirect to admin dashboard
          router.push(ROUTES.ADMIN);
        } catch (err: any) {
          setError('Failed to verify admin access. Please try again.');
          setIsLoading(false);
        }
      }, 100);
    } catch (err: any) {
      // Handle rate limiting or other errors
      const errorMessage = (err instanceof Error ? err.message : 'An error occurred') || 'Login failed. Please try again.';
      if (errorMessage.includes('Too many')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setError(errorMessage);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff5f6] to-[#fde8ea]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:py-16">
        {/* Left side - brand / marketing */}
        <div className="mb-10 flex flex-1 flex-col items-center text-center lg:mb-0 lg:items-start lg:text-left">
          <div className="mb-6 flex items-center gap-3">
            <div className="relative h-14 w-14 rounded-none bg-white shadow-md">
              <Image
                src="/sanskar-academy-logo.jpeg"
                alt="Sanskar Academy"
                fill
                className="rounded-none object-contain"
                sizes="56px"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[#c01e2e]">
                SANSKAR ACADEMY
              </p>
              <p className="text-sm text-gray-600">
                Scientific Vastu &amp; Modern Numerology
              </p>
            </div>
          </div>

          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            Admin Portal
            <br className="hidden sm:block" /> Access your{' '}
            <span className="text-[#c01e2e]">dashboard</span>.
          </h1>
          <p className="max-w-xl text-base text-gray-600 sm:text-lg">
            Sign in with your admin credentials to manage courses, users, finances, and more.
          </p>
        </div>

        {/* Right side - form */}
        <div className="flex-1">
          <Card className="w-full max-w-md rounded-none border border-gray-200 shadow-lg sm:mx-auto" padding="lg">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Admin Login</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter your admin credentials to continue.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-none border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="Enter your admin email"
              />

              <Input
                label="Password"
                type="password"
                showPasswordToggle
                {...register('password')}
                error={errors.password?.message}
                placeholder="Enter your password"
              />

              <div className="flex items-center justify-between text-sm">
                <Link
                  href={ROUTES.FORGOT_PASSWORD}
                  className="font-medium text-[#c01e2e] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-500"
                isLoading={isLoading}
              >
                Login
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Not an admin? </span>
              <Link href={ROUTES.LOGIN} className="font-semibold text-[#c01e2e] hover:underline">
                Go to regular login
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


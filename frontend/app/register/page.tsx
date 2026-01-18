'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/lib/utils/constants';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, verifyOtp, resendOtp } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
  } = useForm<{ otp: string }>({
    resolver: zodResolver(
      z.object({
        otp: z
          .string()
          .regex(/^\d{6}$/, 'OTP must be exactly 6 digits (numbers only)'),
      })
    ),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('');
      setIsLoading(true);
      await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
      });
      setRegisteredEmail(data.email);
      setShowOtpVerification(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data: { otp: string }) => {
    try {
      setError('');
      setIsLoading(true);
      await verifyOtp({
        email: registeredEmail,
        otp: data.otp,
      });
      // After successful verification, redirect to login so the user can sign in.
      router.push(ROUTES.LOGIN);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showOtpVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-[#fff5f6] to-[#fde8ea]">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:py-16">
          {/* Left side - brand */}
          <div className="mb-10 flex flex-1 flex-col items-center text-center lg:mb-0 lg:items-start lg:text-left">
            <div className="mb-6 flex items-center gap-3">
              <div className="relative h-14 w-14 rounded-full bg-white shadow-md">
                <Image
                  src="/sanskar-academy-logo.jpeg"
                  alt="Sanskar Academy"
                  fill
                  className="rounded-full object-contain"
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
              Verify your{' '}
              <span className="text-[#c01e2e]">Sanskar account</span>.
            </h1>
            <p className="max-w-xl text-base text-gray-600 sm:text-lg">
              Enter the one-time password sent to <span className="font-semibold">{registeredEmail}</span>{' '}
              to activate your learning dashboard.
            </p>
          </div>

          {/* Right side - OTP form */}
          <div className="flex-1">
            <Card className="w-full max-w-md rounded-none border border-gray-200 shadow-lg sm:mx-auto" padding="lg">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Verify OTP</h2>
                <p className="mt-2 text-sm text-gray-600">
                Please enter the 6-digit code we sent to your email. This code is valid for{' '}
                <span className="font-semibold">5 minutes</span>.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
                <Input
                  label="OTP"
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  {...registerOtp('otp')}
                  error={otpErrors.otp?.message}
                  placeholder="Enter 6-digit OTP"
                />

                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
                    isLoading={isLoading}
                  >
                    Verify OTP
                  </Button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!registeredEmail) return;
                      try {
                        setError('');
                        setResendMessage('');
                        setIsResending(true);
                        await resendOtp(registeredEmail);
                        setResendMessage('A new OTP has been sent to your email.');
                      } catch (err: any) {
                        setError(err.message || 'Failed to resend OTP. Please try again.');
                      } finally {
                        setIsResending(false);
                      }
                    }}
                    className="text-xs font-medium text-[#c01e2e] hover:underline disabled:opacity-60"
                    disabled={isResending}
                  >
                    {isResending ? 'Resending...' : 'Resend OTP'}
                  </button>
                </div>

                {resendMessage && !error && (
                  <p className="text-xs text-green-600">{resendMessage}</p>
                )}
              </form>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff5f6] to-[#fde8ea]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:py-16">
        {/* Left side - brand / description */}
        <div className="mb-10 flex flex-1 flex-col items-center text-center lg:mb-0 lg:items-start lg:text-left">
          <div className="mb-6 flex items-center gap-3">
            <div className="relative h-14 w-14 rounded-full bg-white shadow-md">
              <Image
                src="/sanskar-academy-logo.jpeg"
                alt="Sanskar Academy"
                fill
                className="rounded-full object-contain"
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
            Join thousands of{' '}
            <span className="text-[#c01e2e]">Sanskar learners</span>.
          </h1>
          <p className="max-w-xl text-base text-gray-600 sm:text-lg">
            Create your account to access professional courses, live classes and lifetime guidance
            from Acharya Raja Babu Shah and the Sanskar Academy team.
          </p>
        </div>

        {/* Right side - form */}
        <div className="flex-1">
          <Card className="w-full max-w-md rounded-none border border-gray-200 shadow-lg sm:mx-auto" padding="lg">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Create your account</h2>
              <p className="mt-2 text-sm text-gray-600">
                Fill in your details to start your journey.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                {...register('fullName')}
                error={errors.fullName?.message}
                placeholder="Enter your full name"
              />

              <Input
                label="Email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="Enter your email"
              />

              {/* Phone with country code selector */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone Number <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <div className="flex">
                  <div className="flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-700">
                    <span className="mr-1 text-gray-500">🇳🇵</span>
                    <span>+977</span>
                  </div>
                  <input
                    type="tel"
                    className="block w-full rounded-r-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#c01e2e] focus:outline-none focus:ring-1 focus:ring-[#c01e2e]"
                    placeholder="98XXXXXXXX"
                    {...register('phone')}
                  />
                </div>
                {errors.phone?.message && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <Input
                label="Password"
                type="password"
                showPasswordToggle
                {...register('password')}
                error={errors.password?.message}
                placeholder="Enter your password"
              />

              <Input
                label="Confirm Password"
                type="password"
                showPasswordToggle
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                placeholder="Confirm your password"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-500"
                isLoading={isLoading}
              >
                Register
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link href={ROUTES.LOGIN} className="font-semibold text-[#c01e2e] hover:underline">
                Sign in
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


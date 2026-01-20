'use client';

import React, { useEffect } from 'react';
import { ReferralDashboard } from '@/components/referrals/ReferralDashboard';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';

export default function ReferralsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth check to complete
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-none h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Main Dashboard - handles all UI */}
          <ReferralDashboard />
        </div>
      </div>
    </div>
  );
}

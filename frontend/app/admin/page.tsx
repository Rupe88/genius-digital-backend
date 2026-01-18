'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import * as adminApi from '@/lib/api/admin';
import * as courseApi from '@/lib/api/courses';
import * as enrollmentApi from '@/lib/api/enrollments';
import * as paymentAnalyticsApi from '@/lib/api/paymentAnalytics';
import { HiUsers, HiBookOpen, HiAcademicCap, HiCurrencyDollar } from 'react-icons/hi';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const dashboardStats = await adminApi.getDashboardStats().catch(() => null);
      
      if (dashboardStats?.data) {
        setStats({
          totalUsers: dashboardStats.data.users?.total || 0,
          totalCourses: dashboardStats.data.courses?.total || 0,
          totalEnrollments: dashboardStats.data.enrollments?.total || 0,
          totalRevenue: dashboardStats.data.revenue?.today || 0,
        });
      } else {
        // Fallback to old method
        const [users, courses, enrollments, analytics] = await Promise.all([
          adminApi.getAllUsers({ limit: 1 }).catch(() => ({ pagination: { total: 0 } })),
          courseApi.getAllCourses({ limit: 1 }).catch(() => ({ pagination: { total: 0 } })),
          enrollmentApi.getEnrollments({ limit: 1 }).catch(() => ({ pagination: { total: 0 } })),
          paymentAnalyticsApi.getPaymentAnalytics().catch(() => ({ totalRevenue: 0 })),
        ]);

        setStats({
          totalUsers: users.pagination?.total || 0,
          totalCourses: courses.pagination?.total || 0,
          totalEnrollments: enrollments.pagination?.total || 0,
          totalRevenue: analytics.totalRevenue || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Admin Dashboard</h1>
        <p className="text-[var(--muted-foreground)] mt-2">
          Overview of your platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card padding="lg">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <HiUsers className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Total Users</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {loading ? '...' : stats.totalUsers}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg mr-4">
              <HiBookOpen className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Total Courses</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {loading ? '...' : stats.totalCourses}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg mr-4">
              <HiAcademicCap className="h-6 w-6 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Total Enrollments</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {loading ? '...' : stats.totalEnrollments}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg mr-4">
              <HiCurrencyDollar className="h-6 w-6 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Total Revenue</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {loading ? '...' : `Rs. ${stats.totalRevenue.toLocaleString()}`}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


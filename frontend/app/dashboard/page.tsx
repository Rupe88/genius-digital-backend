'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/context/AuthContext';
import * as enrollmentApi from '@/lib/api/enrollments';
import { HiBookOpen, HiCheckCircle, HiAcademicCap } from 'react-icons/hi';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    completedCourses: 0,
    certificates: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const enrollments = await enrollmentApi.getEnrollments();
      const enrolled = enrollments.data.length;
      const completed = enrollments.data.filter((e: any) => e.status === 'COMPLETED').length;
      setStats({
        enrolledCourses: enrolled,
        completedCourses: completed,
        certificates: completed, // Assuming certificates = completed courses
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Welcome back, {user?.fullName}!
        </h1>
        <p className="text-[var(--muted-foreground)] mt-2">
          Here's your learning overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card padding="lg">
          <div className="flex items-center">
            <div className="p-3 bg-[var(--primary-100)] rounded-lg mr-4">
              <HiBookOpen className="h-6 w-6 text-[var(--primary-700)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Enrolled Courses</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {loading ? '...' : stats.enrolledCourses}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg mr-4">
              <HiCheckCircle className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Completed</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {loading ? '...' : stats.completedCourses}
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
              <p className="text-sm text-[var(--muted-foreground)]">Certificates</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {loading ? '...' : stats.certificates}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


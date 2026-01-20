'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/context/AuthContext';
import * as enrollmentApi from '@/lib/api/enrollments';
import { ReferralDashboard, ShareButton } from '@/components/referrals';
import { HiBookOpen, HiCheckCircle, HiAcademicCap, HiShare } from 'react-icons/hi';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    completedCourses: 0,
    certificates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const enrollments = await enrollmentApi.getUserEnrollments();
      const enrolled = (enrollments && enrollments.data) ? enrollments.data.length : 0;
      const completed = (enrollments && enrollments.data) ? enrollments.data.filter((e: any) => e.status === 'COMPLETED').length : 0;
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: HiBookOpen },
    { id: 'referrals', label: 'Referrals', icon: HiShare },
  ];

  const handleTabChange = (tabId: string) => {
    console.log('Switching to tab:', tabId);
    setActiveTab(tabId);
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

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <tab.icon className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card padding="lg">
            <div className="flex items-center">
              <div className="p-3 bg-[var(--primary-100)] rounded-none mr-4">
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
              <div className="p-3 bg-green-100 rounded-none mr-4">
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
              <div className="p-3 bg-yellow-100 rounded-none mr-4">
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
      )}

      {activeTab === 'referrals' && (
        <div className="text-center py-8">
          <p className="text-gray-500">Referral system coming soon...</p>
        </div>
      )}
    </div>
  );
}

